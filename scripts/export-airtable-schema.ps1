param(
  [Parameter(Mandatory)][string]$SourceDirectory,
  [string]$OutputPath = (Join-Path $PSScriptRoot '../schema/mls-airtable-schema.json')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead((Join-Path $SourceDirectory 'MLS_Full_Schema.docx'))
try {
  $reader = [IO.StreamReader]::new($archive.GetEntry('word/document.xml').Open())
  try { [xml]$document = $reader.ReadToEnd() } finally { $reader.Dispose() }
} finally { $archive.Dispose() }

function Get-Rows($table) {
  foreach ($row in $table.SelectNodes("./*[local-name()='tr']")) {
    ,@($row.SelectNodes("./*[local-name()='tc']") | ForEach-Object {
      ($_.SelectNodes(".//*[local-name()='t']") | ForEach-Object InnerText) -join ''
    })
  }
}
function Get-Slug([string]$name) {
  return (($name.ToLowerInvariant() -replace '[^a-z0-9]+','_').Trim('_'))
}
function Get-Column([string]$name) {
  $slug = Get-Slug $name
  if ($slug.Length -gt 48) { $slug = $slug.Substring(0,48) }
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($name))).Substring(0,10).ToLowerInvariant()
  return "f_${slug}_$hash"
}
function Get-SqlType([string]$type) {
  switch -Regex ($type) {
    '^(Single line text|Long text|Email|Phone number|URL|Single select|Text)$' { 'TEXT'; break }
    '^(Checkbox)$' { 'BOOLEAN'; break }
    '^(Auto number|Count)$' { 'BIGINT'; break }
    '^(Number|Currency|Percent|Rating|Duration)$' { 'DECIMAL(30,10)'; break }
    '^Date$' { 'DATE'; break }
    '^(Date and time|Date time|Created time|Last modified time)$' { 'DATETIME(3)'; break }
    default { 'JSON' }
  }
}

$body = $document.SelectSingleNode("//*[local-name()='body']")
$overview = $body.SelectSingleNode("./*[local-name()='tbl']")
$catalog = [ordered]@{}
foreach ($row in @(Get-Rows $overview) | Select-Object -Skip 1) {
  if ($row.Count -lt 8 -or $row[2] -notmatch '^tbl[a-zA-Z0-9]+$') { continue }
  $catalog[$row[1]] = [ordered]@{
    name = $row[1]; airtableTableId = $row[2]; primaryField = $row[3]
    mysqlTable = "mls_airtable_$(Get-Slug $row[1])"
    expected = [ordered]@{ fields = [int]$row[4]; core = [int]$row[5]; link = [int]$row[6]; lookup = [int]$row[7] }
    views = @(); fields = [Collections.Generic.List[object]]::new()
  }
}
$current = $null
foreach ($node in $body.ChildNodes) {
  if ($node.LocalName -eq 'p' -and $node.InnerText -match '^Table \d+:\s*(.*?)\s+(tbl[a-zA-Z0-9]+)\s*$') {
    $current = $catalog[$Matches[1]]
    if (!$current -or $current.airtableTableId -cne $Matches[2]) { throw "Unrecognized table heading: $($node.InnerText)" }
    continue
  }
  if (!$current) { continue }
  if ($node.LocalName -eq 'p' -and $node.InnerText -match '^Views:\s*(.*)$') { $current.views = @($Matches[1] -split ',\s*'); continue }
  if ($node.LocalName -ne 'tbl') { continue }
  $rows = @(Get-Rows $node)
  if (!$rows.Count -or $rows[0][0] -ne 'Field') { continue }
  foreach ($row in $rows | Select-Object -Skip 1) {
    $field = [ordered]@{ name = $row[0]; mysqlColumn = Get-Column $row[0] }
    switch ($rows[0][1]) {
      'Type' { $field.kind = 'core'; $field.airtableType = $row[1]; $field.details = $row[2]; $field.mysqlType = Get-SqlType $row[1] }
      'Links to' { $field.kind = 'link'; $field.airtableType = 'Linked record'; $field.targetTable = $row[1]; $field.inverseField = $row[2]; $field.cardinality = $row[3]; $field.mysqlType = 'JSON' }
      'Via link field' { $field.kind = 'lookup'; $field.airtableType = 'Lookup'; $field.viaField = $row[1]; $field.source = $row[2]; $field.returns = $row[3]; $field.mysqlType = 'JSON' }
      default { throw "Unknown field header: $($rows[0][1])" }
    }
    $current.fields.Add($field)
  }
}
foreach ($table in $catalog.Values) {
  if ($table.fields.Count -ne $table.expected.fields) { throw "Unexpected field count for $($table.name): $($table.fields.Count) of $($table.expected.fields)." }
  foreach ($kind in @('core','link','lookup')) {
    if (@($table.fields | Where-Object kind -eq $kind).Count -ne $table.expected[$kind]) { throw "Unexpected $kind count for $($table.name)." }
  }
  foreach ($field in $table.fields) {
    if ($field.kind -eq 'link' -and $catalog.Contains($field.targetTable)) { $field.targetTableId = $catalog[$field.targetTable].airtableTableId }
  }
}
$exports = foreach ($file in Get-ChildItem -LiteralPath $SourceDirectory -Filter '*.json') {
  $records = @(Get-Content -LiteralPath $file.FullName -Raw | ConvertFrom-Json -AsHashtable)
  $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($record in $records) { foreach ($name in $record.fields.Keys) { [void]$names.Add($name) } }
  $table = $catalog[$file.BaseName]
  if (!$table) { throw "No schema table matches $($file.Name)." }
  [ordered]@{ file = $file.Name; table = $table.name; recordCount = $records.Count; exportedFieldNames = @($names | Sort-Object -CaseSensitive); fieldsAbsentFromDocument = @($names | Where-Object { $_ -cnotin $table.fields.name } | Sort-Object -CaseSensitive) }
}
$fieldCount = ($catalog.Values | ForEach-Object {$_.fields.Count} | Measure-Object -Sum).Sum
if ($catalog.Count -ne 27 -or $fieldCount -ne 1085) { throw 'Unexpected Airtable catalog size.' }
$schema = [ordered]@{
  version = 1; base = [ordered]@{ name = 'Marie-Louise School SMS'; id = 'appkx6EobFEi9GNV9' }
  schemaSource = 'MLS_Full_Schema.docx'; tableCount = $catalog.Count; fieldCount = $fieldCount
  mysql = [ordered]@{ purpose = 'Airtable mirror alongside the portal database'; recordIdColumn = 'airtable_record_id'; computedFieldPolicy = 'Store exported values. Airtable formulas, rollups and lookups are metadata and are not evaluated by MySQL.' }
  tables = @($catalog.Values); exportCoverage = @($exports)
}
$fullPath = [IO.Path]::GetFullPath($OutputPath)
[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fullPath))
$schema | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $fullPath -Encoding utf8
Write-Output "Saved $($catalog.Count) tables and $fieldCount fields to $fullPath."
