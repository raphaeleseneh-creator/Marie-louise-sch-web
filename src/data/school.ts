/**
 * Official Academic Data Source & Configuration for Marie Louise School, Surulere, Lagos
 * 
 * STRICT ACADEMIC SCOPE RULE:
 * Marie Louise School is strictly a NURSERY AND PRIMARY SCHOOL.
 * Only the following classes exist:
 * - Early Years: Transition, Nursery 1, Nursery 2, Preparatory
 * - Primary School: Primary 1, Primary 2, Primary 3, Primary 4, Primary 5, Primary 6
 * 
 * Secondary classes (JSS, SSS, High School, College, Sixth Form, etc.) are strictly forbidden.
 */

export const SCHOOL_CLASSES = [
  "Transition",
  "Nursery 1",
  "Nursery 2",
  "Preparatory",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
] as const;

export type SchoolClass = (typeof SCHOOL_CLASSES)[number];

export const ACADEMIC_STAGES = {
  earlyYears: [
    "Transition",
    "Nursery 1",
    "Nursery 2",
    "Preparatory"
  ],
  primary: [
    "Primary 1",
    "Primary 2",
    "Primary 3",
    "Primary 4",
    "Primary 5",
    "Primary 6"
  ]
} as const;

export interface SchoolConfig {
  currentAcademicSession: string;
  admissionsOpen: boolean;
  admissionsMessage: string;
  motto: string;
  location: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  address: string;
}

export const schoolConfig: SchoolConfig = {
  currentAcademicSession: "", // Left empty if not provided; displays evergreen copy
  admissionsOpen: true,
  admissionsMessage: "Admissions are now open for Early Years and Primary classes.",
  motto: "Be Truthful",
  location: "Surulere, Lagos",
  neighborhood: "Surulere",
  city: "Lagos",
  state: "Lagos State",
  country: "Nigeria",
  phone: "+234 (0) 803 300 1234",
  email: "admissions@marielouiseschool.com",
  address: "Surulere, Lagos State, Nigeria",
};

export interface SchoolValue {
  name: string;
  title: string;
  description: string;
  editorialDetail: string;
}

export const SCHOOL_VALUES: SchoolValue[] = [
  {
    name: "Academic Excellence",
    title: "Rigorous, engaging intellectual foundations",
    description: "Developing mastery in foundational literacy, numeracy, and scientific thinking through evidence-based, inquiry-driven pedagogy.",
    editorialDetail: "Structured learning milestones calibrated to ignite natural curiosity from Transition to Primary 6."
  },
  {
    name: "Character & Truth",
    title: "Guided by our founding motto 'Be Truthful'",
    description: "Instilling deep integrity, honesty, moral clarity, and mutual respect in everyday interactions and learning routines.",
    editorialDetail: "Character is not merely taught as a subject; it is lived in our assemblies, playgrounds, and shared duties."
  },
  {
    name: "Confidence",
    title: "Articulate voice and resilient self-belief",
    description: "Giving every child the stage, the pen, and the platform to express their thoughts clearly, listen thoughtfully, and embrace challenges.",
    editorialDetail: "Regular presentations, speech activities, and collaborative problem-solving from early years."
  },
  {
    name: "Compassion",
    title: "Empathy, kindness, and community spirit",
    description: "Nurturing genuine care for peers, teachers, families, and the wider Nigerian and global community.",
    editorialDetail: "Fostering an inclusive family atmosphere where every child is seen, known, and supported."
  },
  {
    name: "Creativity",
    title: "Imaginative thought and hands-on expression",
    description: "Encouraging artistic, linguistic, and inventive inquiry through art, performance, construction, and music.",
    editorialDetail: "Hands-on projects that bridge imagination with practical problem-solving skills."
  }
];

export interface DevelopmentPillar {
  pillar: "CONFIDENT" | "CURIOUS" | "COMPASSIONATE" | "CAPABLE";
  subtitle: string;
  statement: string;
  quote: string;
  tag: string;
  image: string;
}

export const SCHOOL_IMAGES = {
  earlyYears: "/images/school/early-years-classroom.jpg",
  outdoorLearning: "/images/school/outdoor-learning-circle.jpg",
  martialArts: "/images/school/martial-arts-activity.jpg",
  primaryStudy: "/images/school/primary-classroom-study.jpg",
  concert: "/images/school/concert-performance.jpg",
} as const;

export const DEVELOPMENT_PILLARS: DevelopmentPillar[] = [
  {
    pillar: "CONFIDENT",
    subtitle: "Articulate, grounded, and unafraid to try",
    statement: "Children at Marie Louise learn to stand tall, share their ideas with poise, and welcome challenges as opportunities for growth.",
    quote: "A confident child approaches every new concept not with anxiety, but with eager anticipation.",
    tag: "Oratory & Self-Expression",
    image: SCHOOL_IMAGES.concert
  },
  {
    pillar: "CURIOUS",
    subtitle: "Asking deep questions and exploring the world",
    statement: "We nurture the instinct to inquire, probe, investigate, and discover why things work—from living plants to numbers.",
    quote: "Curiosity is the engine of intellectual endurance.",
    tag: "Inquiry & Discovery",
    image: SCHOOL_IMAGES.outdoorLearning
  },
  {
    pillar: "COMPASSIONATE",
    subtitle: "Kind, thoughtful, and deeply respectful",
    statement: "Grounded in our motto 'Be Truthful', our pupils learn to honor others, practice empathy, and be dependable friends.",
    quote: "Integrity and kindness form the bedrock of enduring leadership.",
    tag: "Character & Community",
    image: SCHOOL_IMAGES.earlyYears
  },
  {
    pillar: "CAPABLE",
    subtitle: "Equipped with strong foundational competencies",
    statement: "From foundational phonics and mental arithmetic to digital fluency and analytical reasoning, our pupils master essential life skills.",
    quote: "True capability comes from steady, supported daily practice.",
    tag: "Foundational Mastery",
    image: SCHOOL_IMAGES.primaryStudy
  }
];

export interface LearningExperienceItem {
  id: string;
  name: string;
  category: string;
  focus: string;
  description: string;
  image: string;
}

export const LEARNING_EXPERIENCES: LearningExperienceItem[] = [
  {
    id: "literacy",
    name: "Literacy & Phonics",
    category: "Core Foundations",
    focus: "Synthetic Phonics, Guided Reading & Creative Writing",
    description: "Instilling an enduring love of books, strong phonetic decoding, vocabulary enrichment, and articulate written expression from Early Years onward.",
    image: SCHOOL_IMAGES.earlyYears
  },
  {
    id: "numeracy",
    name: "Numeracy & Logic",
    category: "Analytical Thinking",
    focus: "Concrete-Pictorial-Abstract Mathematics",
    description: "Building strong number sense, spatial awareness, mental maths agility, and practical problem-solving using tactile manipulatives.",
    image: SCHOOL_IMAGES.primaryStudy
  },
  {
    id: "science",
    name: "Science & Nature",
    category: "Inquiry",
    focus: "Hands-on Experiments & Observation",
    description: "Cultivating young scientists who observe nature, test hypotheses, record findings, and marvel at the natural world.",
    image: SCHOOL_IMAGES.outdoorLearning
  },
  {
    id: "creative-arts",
    name: "Creative Arts",
    category: "Expression",
    focus: "Painting, Craft & Visual Aesthetics",
    description: "Fostering visual creativity, colour theory, texture experimentation, and fine motor dexterity through diverse artistic media.",
    image: SCHOOL_IMAGES.concert
  },
  {
    id: "digital",
    name: "Digital Learning",
    category: "Modern Skills",
    focus: "Age-Appropriate Digital Literacy & Computational Logic",
    description: "Introducing safe, interactive technology that transforms children from passive consumers into creative, confident digital learners.",
    image: SCHOOL_IMAGES.primaryStudy
  },
  {
    id: "physical",
    name: "Physical Development",
    category: "Health & Vitality",
    focus: "Agility, Teamwork & Motor Coordination",
    description: "Daily structured movement, team games, balance exercises, and playground sports that foster physical stamina and sportsmanship.",
    image: SCHOOL_IMAGES.martialArts
  },
  {
    id: "character",
    name: "Character Development",
    category: "Values",
    focus: "'Be Truthful', Responsibility & Courtesy",
    description: "Daily reflections, polite manners, accountability, leadership opportunities, and community stewardship woven into school routines.",
    image: SCHOOL_IMAGES.earlyYears
  },
  {
    id: "collaborative",
    name: "Collaborative Learning",
    category: "Social Growth",
    focus: "Group Projects & Peer Discourse",
    description: "Teaching children to negotiate roles, listen empathetically, share credit, and solve multifaceted challenges as a unified team.",
    image: SCHOOL_IMAGES.outdoorLearning
  }
];

export interface SchoolStory {
  id: string;
  category: "Academics" | "School Life" | "Celebration" | "Community";
  date: string;
  headline: string;
  excerpt: string;
  image: string;
  featured?: boolean;
}

export const SCHOOL_STORIES: SchoolStory[] = [
  {
    id: "end-of-year-concert",
    category: "Celebration",
    date: "School Showcase",
    headline: "End of Year Concert: Confidence and Creativity Take Centre Stage",
    excerpt: "Music, drama and dance give every pupil a chance to perform with confidence, celebrate progress and share their creativity with our school community.",
    image: SCHOOL_IMAGES.concert,
    featured: true
  },
  {
    id: "outdoor-learning",
    category: "School Life",
    date: "Campus Spotlight",
    headline: "Learning in the Open: Reading, Reflection and Shared Discovery",
    excerpt: "Our outdoor learning circle gives pupils space to read together, exchange ideas and build confidence through attentive teacher guidance.",
    image: SCHOOL_IMAGES.outdoorLearning,
    featured: false
  },
  {
    id: "character-day-truth",
    category: "Celebration",
    date: "Values & Traditions",
    headline: "Living Our Motto 'Be Truthful': Everyday Integrity in Action",
    excerpt: "Honouring pupils across both Early Years and Primary who demonstrated exceptional honesty, quiet helpfulness, and peer encouragement this term.",
    image: SCHOOL_IMAGES.earlyYears,
    featured: false
  }
];

export interface SchoolLifeMoment {
  title: string;
  category: string;
  caption: string;
  image: string;
  aspect: "landscape" | "portrait" | "square";
}

export const SCHOOL_LIFE_MOMENTS: SchoolLifeMoment[] = [
  {
    title: "Classroom Concentration",
    category: "Academic Life",
    caption: "Engaged focus during mental arithmetic exercises in Primary 4.",
    image: SCHOOL_IMAGES.primaryStudy,
    aspect: "landscape"
  },
  {
    title: "Early Years Collaboration",
    category: "Transition & Nursery",
    caption: "Young learners share ideas around a classroom table in a warm, colourful setting.",
    image: SCHOOL_IMAGES.earlyYears,
    aspect: "portrait"
  },
  {
    title: "End of Year Performance",
    category: "Arts & Culture",
    caption: "Pupils express confidence, rhythm and teamwork on the concert stage.",
    image: SCHOOL_IMAGES.concert,
    aspect: "square"
  },
  {
    title: "Outdoor Reading Circle",
    category: "Literacy & Phonics",
    caption: "Teacher-led group reading in the school\'s colourful outdoor learning area.",
    image: SCHOOL_IMAGES.outdoorLearning,
    aspect: "portrait"
  },
  {
    title: "Martial Arts & Movement",
    category: "Sports & Fitness",
    caption: "Structured martial arts activities build coordination, discipline and confidence.",
    image: SCHOOL_IMAGES.martialArts,
    aspect: "landscape"
  },
  {
    title: "Collaborative Study",
    category: "Primary 5 & 6",
    caption: "Focused written work and shared concentration in a primary classroom.",
    image: SCHOOL_IMAGES.primaryStudy,
    aspect: "square"
  }
];
