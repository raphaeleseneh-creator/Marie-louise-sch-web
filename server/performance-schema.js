import {pool} from './db.js';

export async function ensurePerformanceIndexes(db=pool){
  for(const [table,name,columns] of [
    ['academic_results','idx_parent_published_results',['student_id','publication_status','term_name','subject']],
    ['payments','idx_invoice_payment_date',['invoice_id','payment_date']],
  ]){
    const [indexes]=await db.query('SELECT INDEX_NAME index_name,GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) index_columns FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? GROUP BY INDEX_NAME',[table]);
    if(indexes.some(index=>index.index_columns.split(',').slice(0,columns.length).join(',')===columns.join(',')))continue;
    await db.query(`CREATE INDEX \`${name}\` ON \`${table}\` (${columns.map(column=>'`'+column+'`').join(',')})`);
  }
}
