module.exports = {
    apps: [
        {
            name: 'ariesxpert-backend',
            script: 'dist/main.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3001, // Ensure this port doesn't conflict with your other backend
            },
            env_production: {
                NODE_ENV: 'production',
            },
            error_file: 'logs/err.log',
            out_file: 'logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
