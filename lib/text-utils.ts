// lib/text-utils.ts
// Shared text utilities for acronym normalization and text processing

// Map of acronyms that should always be uppercase/properly cased
export const ACRONYM_MAP: Record<string, string> = {
    // AI/ML terms
    'llm': 'LLM', 'llms': 'LLMs',
    'nlp': 'NLP',
    'ml': 'ML', 'ai': 'AI', 'rag': 'RAG',
    'cnn': 'CNN', 'rnn': 'RNN', 'lstm': 'LSTM', 'gpt': 'GPT',
    'gan': 'GAN', 'gans': 'GANs',
    'bert': 'BERT', 'transformer': 'Transformer', 'transformers': 'Transformers',

    // Database terms
    'sql': 'SQL', 'nosql': 'NoSQL', 'mysql': 'MySQL',
    'postgresql': 'PostgreSQL', 'mssql': 'MSSQL',
    'mongodb': 'MongoDB', 'dynamodb': 'DynamoDB',
    'jdbc': 'JDBC', 'odbc': 'ODBC',

    // API/Web terms
    'api': 'API', 'apis': 'APIs', 'rest': 'REST', 'restful': 'RESTful',
    'graphql': 'GraphQL', 'grpc': 'gRPC',
    'html': 'HTML', 'css': 'CSS', 'json': 'JSON', 'xml': 'XML', 'yaml': 'YAML',
    'http': 'HTTP', 'https': 'HTTPS', 'ssh': 'SSH', 'ssl': 'SSL', 'tls': 'TLS',
    'oauth': 'OAuth', 'jwt': 'JWT',
    'sdk': 'SDK', 'ide': 'IDE', 'orm': 'ORM',

    // Cloud platforms
    'aws': 'AWS', 'gcp': 'GCP', 'azure': 'Azure',
    'saas': 'SaaS', 'paas': 'PaaS', 'iaas': 'IaaS',
    'ec2': 'EC2', 's3': 'S3', 'rds': 'RDS', 'ecs': 'ECS', 'eks': 'EKS',

    // DevOps/Infrastructure
    'etl': 'ETL', 'elt': 'ELT',
    'ci/cd': 'CI/CD', 'cicd': 'CI/CD',
    'k8s': 'K8s', 'kubernetes': 'Kubernetes',
    'docker': 'Docker', 'terraform': 'Terraform',
    'dag': 'DAG', 'dags': 'DAGs',
    'sla': 'SLA', 'slas': 'SLAs',

    // Hardware
    'gpu': 'GPU', 'gpus': 'GPUs', 'cpu': 'CPU', 'cpus': 'CPUs',
    'tpu': 'TPU', 'tpus': 'TPUs',

    // Business metrics
    'kpi': 'KPI', 'kpis': 'KPIs', 'roi': 'ROI',
    'bi': 'BI',

    // Frameworks/Tools
    'nodejs': 'Node.js', 'node.js': 'Node.js',
    'reactjs': 'React.js', 'react.js': 'React.js', 'react': 'React',
    'vuejs': 'Vue.js', 'vue.js': 'Vue.js', 'vue': 'Vue',
    'nextjs': 'Next.js', 'next.js': 'Next.js',
    'fastapi': 'FastAPI',
    'pytorch': 'PyTorch', 'tensorflow': 'TensorFlow',
    'apache': 'Apache', 'kafka': 'Kafka', 'spark': 'Spark',
    'airflow': 'Airflow', 'hadoop': 'Hadoop',
    'elasticsearch': 'Elasticsearch', 'redis': 'Redis',
    'snowflake': 'Snowflake', 'databricks': 'Databricks',
    'tableau': 'Tableau', 'powerbi': 'Power BI', 'power bi': 'Power BI',
    'looker': 'Looker',

    // Programming languages (ensure proper casing)
    'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript',
    'typescript': 'TypeScript', 'golang': 'Golang', 'scala': 'Scala',
    'kotlin': 'Kotlin', 'swift': 'Swift', 'rust': 'Rust',

    // Methodologies
    'agile': 'Agile', 'scrum': 'Scrum', 'kanban': 'Kanban',
    'devops': 'DevOps', 'mlops': 'MLOps', 'dataops': 'DataOps',

    // Compliance
    'hipaa': 'HIPAA', 'gdpr': 'GDPR', 'soc2': 'SOC2', 'soc 2': 'SOC 2',
    'pci': 'PCI', 'sox': 'SOX',
};

/**
 * Normalize acronym casing in a string.
 * Replaces common tech acronyms with their properly-cased versions.
 */
export function normalizeAcronyms(text: string): string {
    if (!text) return '';

    let result = text;
    // Match whole words only (case-insensitive)
    for (const [lower, proper] of Object.entries(ACRONYM_MAP)) {
        // Create a regex that matches the word with word boundaries
        // Escape special regex characters in the key (like . in node.js)
        const escapedKey = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
        result = result.replace(regex, proper);
    }
    return result;
}

/**
 * Capitalize the first letter of a string while preserving the rest.
 * Then apply acronym normalization to handle tech terms correctly.
 */
export function capitalizeWithAcronyms(text: string): string {
    if (!text) return '';

    // First do basic capitalization
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);

    // Then normalize acronyms
    return normalizeAcronyms(capitalized);
}

/**
 * Clean text by removing problematic characters and normalizing acronyms.
 */
export function cleanText(text: string): string {
    if (!text) return '';

    return normalizeAcronyms(
        text
            .replace(/—/g, '-') // Em dash to hyphen
            .replace(/–/g, '-') // En dash to hyphen
    );
}
