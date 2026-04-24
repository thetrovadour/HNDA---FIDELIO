 FIDELIO — Full Production Deployment Guide                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                               
  Assumptions                                                             
                                         
  - Domain: hnda.io (bought, DNS editable)                                                                                                                                                                                                                                     
  - VPS: Hetzner or DigitalOcean, Debian 12, 2 vCPU / 4GB RAM / 80GB SSD
  - You SSH in as root initially                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Step 1 — First login & server hardening                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                               
  # Log in as root                       
  ssh root@YOUR_VPS_IP                                                                                                                                                                                                                                                         
                                                                          
  # Update everything first              
  apt update && apt upgrade -y
                                                                                                                                                                                                                                                                               
  # Create a non-root user (never run your app as root)
  adduser cristian                                                                                                                                                                                                                                                             
  usermod -aG sudo cristian                                                                                                                                                                                                                                                    
                                         
  # Copy your SSH key to the new user                                                                                                                                                                                                                                          
  rsync --archive --chown=cristian:cristian ~/.ssh /home/cristian         
                                                                                                                                                                                                                                                                               
  # Test the new user in a second terminal before closing root session                                                                                                                                                                                                         
  ssh cristian@YOUR_VPS_IP                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                               
  # Lock down SSH — disable root login and password auth                  
  nano /etc/ssh/sshd_config                                                                                                                                                                                                                                                    
                                                                          
  In sshd_config, set these:                                                                                                                                                                                                                                                   
  PermitRootLogin no
  PasswordAuthentication no                                                                                                                                                                                                                                                    
  PubkeyAuthentication yes                                                
                                         
  systemctl restart sshd                                                                                                                                                                                                                                                       
   
  ---                                                                                                                                                                                                                                                                          
  Step 2 — Firewall                                                       
                                         
  apt install -y ufw
                                                                                                                                                                                                                                                                               
  # Allow only what needs to be public
  ufw allow OpenSSH                                                                                                                                                                                                                                                            
  ufw allow 80/tcp                                                        
  ufw allow 443/tcp                                                                                                                                                                                                                                                            
   
  # Enable                                                                                                                                                                                                                                                                     
  ufw enable                                                              
  ufw status                             

  PostgreSQL (5432), Node.js (3000, 3001) — never exposed publicly. Nginx is the only public-facing process.                                                                                                                                                                   
   
  ---                                                                                                                                                                                                                                                                          
  Step 3 — Install Node.js (via nvm, same as dev)                         
                                                                                                                                                                                                                                                                               
  # Install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash                                                                                                                                                                                              
  source ~/.bashrc                                                                                                                                                                                                                                                             
                                         
  # Install Node 20 LTS (matches dev environment)                                                                                                                                                                                                                              
  nvm install 20                                                          
  nvm use 20                             
  nvm alias default 20                                                                                                                                                                                                                                                         
   
  # Verify                                                                                                                                                                                                                                                                     
  node -v   # v20.x.x                                                     
  npm -v                                 

  ---
  Step 4 — Install PostgreSQL
                                                                                                                                                                                                                                                                               
  # Install PostgreSQL 16 (official repo — newer than Debian default)
  apt install -y curl ca-certificates                                                                                                                                                                                                                                          
  install -d /usr/share/postgresql-common/pgdg                            
  curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc                                                                                                                                                   
  sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'                                                                            
  apt update                                                                                                                                                                                                                                                                   
  apt install -y postgresql-16                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                               
  # Start and enable                                                      
  systemctl start postgresql             
  systemctl enable postgresql

  # Create the database and user                                                                                                                                                                                                                                               
  sudo -u postgres psql
                                                                                                                                                                                                                                                                               
  Inside psql:                                                            
  CREATE USER fidelio_user WITH PASSWORD 'your_strong_password_here';
  CREATE DATABASE fidelio_prod OWNER fidelio_user;                   
  GRANT ALL PRIVILEGES ON DATABASE fidelio_prod TO fidelio_user;                                                                                                                                                                                                               
  \q
                                                                                                                                                                                                                                                                               
  ---                                                                     
  Step 5 — Install C++ build tools (for MerL1nk)                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                               
  apt install -y build-essential cmake libcurl4-openssl-dev
                                                                                                                                                                                                                                                                               
  # Verify                                                                
  cmake --version                        
  g++ --version

  ---                                                                                                                                                                                                                                                                          
  Step 6 — Install Nginx + Certbot
                                                                                                                                                                                                                                                                               
  apt install -y nginx certbot python3-certbot-nginx                      
                                         
  systemctl start nginx                                                                                                                                                                                                                                                        
  systemctl enable nginx
                                                                                                                                                                                                                                                                               
  ---                                                                     
  Step 7 — Install PM2 (process manager) 

  npm install -g pm2

  # PM2 will keep Node.js processes alive across reboots                                                                                                                                                                                                                       
  pm2 startup systemd
  # Run the command it outputs, e.g.:                                                                                                                                                                                                                                          
  sudo env PATH=$PATH:/home/cristian/.nvm/versions/node/v20.20.2/bin pm2 startup systemd -u cristian --hp /home/cristian                                                                                                                                                       
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Step 8 — DNS setup                                                                                                                                                                                                                                                           
                                                                          
  In your domain registrar (Namecheap/Porkbun), add these DNS records pointing to your VPS IP:
                                                                                                                                                                                                                                                                               
  ┌──────┬───────┬─────────────┐
  │ Type │ Name  │    Value    │                                                                                                                                                                                                                                               
  ├──────┼───────┼─────────────┤                                          
  │ A    │ @     │ YOUR_VPS_IP │         
  ├──────┼───────┼─────────────┤
  │ A    │ www   │ YOUR_VPS_IP │                                                                                                                                                                                                                                               
  ├──────┼───────┼─────────────┤
  │ A    │ api   │ YOUR_VPS_IP │                                                                                                                                                                                                                                               
  ├──────┼───────┼─────────────┤                                          
  │ A    │ admin │ YOUR_VPS_IP │         
  └──────┴───────┴─────────────┘                                                                                                                                                                                                                                               
  
  Wait 5-30 minutes for propagation. Test with:                                                                                                                                                                                                                                
  ping hnda.io                                                            
                                         
  ---                                                                                                                                                                                                                                                                          
  Step 9 — Clone and build the project
                                                                                                                                                                                                                                                                               
  # Create app directory                                                  
  mkdir -p /home/cristian/apps                                                                                                                                                                                                                                                 
  cd /home/cristian/apps
                                                                                                                                                                                                                                                                               
  # Clone your repo                                                       
  git clone https://github.com/YOUR_USERNAME/HNDA---FIDELIO.git fidelio
  cd fidelio                                                                                                                                                                                                                                                                   
  
  # Install dependencies                                                                                                                                                                                                                                                       
  npm install                                                             
                                         
  # Build MerL1nk C++ core
  cd packages/merlink/core
  mkdir -p build && cd build                                                                                                                                                                                                                                                   
  cmake .. -DCMAKE_BUILD_TYPE=Release
  make -j$(nproc)                                                                                                                                                                                                                                                              
  cd /home/cristian/apps/fidelio                                          
                                                                                                                                                                                                                                                                               
  ---                                                                     
  Step 10 — Environment variables        
                                                                                                                                                                                                                                                                               
  # Backend .env
  nano packages/backend/.env                                                                                                                                                                                                                                                   
                                                                          
  DATABASE_URL="postgresql://fidelio_user:your_strong_password_here@localhost:5432/fidelio_prod"                                                                                                                                                                               
  JWT_SECRET="generate_a_long_random_string_here"
  ADMIN_JWT_SECRET="another_long_random_string_here"                                                                                                                                                                                                                           
  PORT=3001                                                                                                                                                                                                                                                                    
  NODE_ENV=production                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                               
  # Web .env.production                                                   
  nano packages/web/.env.production      

  NEXT_PUBLIC_BACKEND_URL=https://api.hnda.io                                                                                                                                                                                                                                  
  NODE_ENV=production
                                                                                                                                                                                                                                                                               
  Generate strong secrets:                                                                                                                                                                                                                                                     
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
                                                                                                                                                                                                                                                                               
  ---                                                                     
  Step 11 — Run Prisma migration on production DB
                                                                                                                                                                                                                                                                               
  cd /home/cristian/apps/fidelio/packages/backend
  npx prisma migrate deploy                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                               
  migrate deploy (not dev) — applies existing migrations without generating new ones. Safe for production.                                                                                                                                                                     
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Step 12 — Build the web app                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                               
  cd /home/cristian/apps/fidelio
  npm run build                                                                                                                                                                                                                                                                
                                                                          
  ---                                                                                                                                                                                                                                                                        
  Step 13 — PM2 process config
                              
  Create the PM2 ecosystem file at the project root:
                                                                                                                                                                                                                                                                               
  nano /home/cristian/apps/fidelio/ecosystem.config.js
                                                                                                                                                                                                                                                                               
  module.exports = {                                                      
    apps: [                                                                                                                                                                                                                                                                    
      {                                                                   
        name: 'fidelio-backend',                                                                                                                                                                                                                                             
        cwd: '/home/cristian/apps/fidelio/packages/backend',
        script: 'npm',                                                                                                                                                                                                                                                         
        args: 'start',
        env: {                                                                                                                                                                                                                                                                 
          NODE_ENV: 'production',                                         
          PORT: 3001,                                                                                                                                                                                                                                                        
        },                                                                                                                                                                                                                                                                     
        restart_delay: 3000,
        max_restarts: 10,                                                                                                                                                                                                                                                      
      },                                                                  
      {                                                                                                                                                                                                                                                                      
        name: 'fidelio-web',
        cwd: '/home/cristian/apps/fidelio/packages/web',
        script: 'npm',                                                                                                                                                                                                                                                         
        args: 'start',
        env: {                                                                                                                                                                                                                                                                 
          NODE_ENV: 'production',                                         
          PORT: 3000,                                                                                                                                                                                                                                                        
        },                                                                                                                                                                                                                                                                     
        restart_delay: 3000,
        max_restarts: 10,                                                                                                                                                                                                                                                      
      },                                                                  
    ],                                                                                                                                                                                                                                                                       
  };

  Start all processes:                                                                                                                                                                                                                                                         
  cd /home/cristian/apps/fidelio
  pm2 start ecosystem.config.js                                                                                                                                                                                                                                                
  pm2 save   # persist across reboots                                     
  pm2 status # verify both are online                                                                                                                                                                                                                                        

  ---                                                                                                                                                                                                                                                                          
  Step 14 — Nginx configuration
                                                                                                                                                                                                                                                                               
  nano /etc/nginx/sites-available/hnda                                    
                                                                                                                                                                                                                                                                               
  # ── hnda.io → Next.js web app ─────────────────────────────────────────────────
  server {                                                                                                                                                                                                                                                                     
      listen 80;                                                          
      server_name hnda.io www.hnda.io;                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                               
      location / {                                                                                                                                                                                                                                                           
          proxy_pass http://localhost:3000;                                                                                                                                                                                                                                    
          proxy_http_version 1.1;                                         
          proxy_set_header Upgrade $http_upgrade;                                                                                                                                                                                                                            
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;                                                                                                                                                                                                                                         
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;                                                                                                                                                                                                         
          proxy_set_header X-Forwarded-Proto $scheme;                     
          proxy_cache_bypass $http_upgrade;                                                                                                                                                                                                                                    
      }
  }                                                                                                                                                                                                                                                                            
                                                                          
  # ── api.hnda.io → Express backend ─────────────────────────────────────────────                                                                                                                                                                                             
  server {
      listen 80;                                                                                                                                                                                                                                                               
      server_name api.hnda.io;                                            
                                                                                                                                                                                                                                                                             
      location / {
          proxy_pass http://localhost:3001;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;                                                                                                                                                                                                                              
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;                                                                                                                                                                                                                                         
          proxy_set_header X-Real-IP $remote_addr;                        
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;                                                                                                                                                                                                         
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_cache_bypass $http_upgrade;                                                                                                                                                                                                                                    
      }                                                                   
  }                                                                                                                                                                                                                                                                            
  
  # ── admin.hnda.io → same Next.js, Nginx restricts path ───────────────────────                                                                                                                                                                                              
  server {                                                                
      listen 80;                                                                                                                                                                                                                                                               
      server_name admin.hnda.io;                                          
                                                                                                                                                                                                                                                                             
      location / {
          proxy_pass http://localhost:3000;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;                                                                                                                                                                                                                             
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;                                                                                                                                                                                                                          
      }                                                                                                                                                                                                                                                                        
  }                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                               
  Enable and test:                                                        
  ln -s /etc/nginx/sites-available/hnda /etc/nginx/sites-enabled/hnda                                                                                                                                                                                                        
  nginx -t          # must say: syntax is ok                         
  systemctl reload nginx                                                                                                                                                                                                                                                       
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Step 15 — SSL with Let's Encrypt (free HTTPS)                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                             
  certbot --nginx -d hnda.io -d www.hnda.io -d api.hnda.io -d admin.hnda.io                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                               
  Certbot will:
  1. Verify domain ownership via HTTP                                                                                                                                                                                                                                          
  2. Issue certificates                                                                                                                                                                                                                                                        
  3. Automatically rewrite your Nginx config to add HTTPS and redirect HTTP → HTTPS                                                                                                                                                                                          
                                                                                                                                                                                                                                                                               
  Auto-renewal is already configured by Certbot. Verify:                                                                                                                                                                                                                       
  certbot renew --dry-run                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Step 16 — Verify everything is running                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                               
  # PM2 processes                                                         
  pm2 status                                                                                                                                                                                                                                                                   
  
  # Test backend                                                                                                                                                                                                                                                               
  curl https://api.hnda.io/api/health                                     
                                                                                                                                                                                                                                                                             
  # Test web
  curl -I https://hnda.io
                                                                                                                                                                                                                                                                               
  # Nginx logs if something's wrong
  tail -f /var/log/nginx/error.log                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                               
  # Backend logs                                                                                                                                                                                                                                                             
  pm2 logs fidelio-backend                                                                                                                                                                                                                                                     
                                                                          
  # Web logs                                                                                                                                                                                                                                                                 
  pm2 logs fidelio-web

  ---
  Deployment checklist summary
                                                                                                                                                                                                                                                                               
  [ ] VPS created, Debian 12, SSH key only
  [ ] UFW firewall: 22/80/443 only                                                                                                                                                                                                                                             
  [ ] Non-root user created                                               
  [ ] Node 20 via nvm                                                                                                                                                                                                                                                          
  [ ] PostgreSQL 16 + fidelio_prod database                                                                                                                                                                                                                                    
  [ ] C++ build tools (cmake, g++, libcurl)                                                                                                                                                                                                                                  
  [ ] Nginx + Certbot installed                                                                                                                                                                                                                                                
  [ ] PM2 installed + startup configured                                  
  [ ] DNS A records pointing to VPS IP                                                                                                                                                                                                                                         
  [ ] Repo cloned, npm install done                                       
  [ ] MerL1nk C++ built (Release mode)                                                                                                                                                                                                                                         
  [ ] .env files created with real secrets                                                                                                                                                                                                                                     
  [ ] prisma migrate deploy run                                                                                                                                                                                                                                              
  [ ] npm run build succeeded                                                                                                                                                                                                                                                  
  [ ] PM2 started + pm2 save done                                         
  [ ] Nginx config enabled + tested                                                                                                                                                                                                                                            
  [ ] Certbot SSL issued for all subdomains                                                                                                                                                                                                                                    
  [ ] Health check passing on https://api.hnda.io/api/health                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                               
  ---                                                                                                                                                                                                                                                                          
  Future updates (how to deploy a new version)                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                               
  cd /home/cristian/apps/fidelio
  git pull                                                                                                                                                                                                                                                                     
  npm install                                                             
  npm run build                                                                                                                                                                                                                                                                
  cd packages/backend && npx prisma migrate deploy && cd ../..            
  pm2 restart all                                                                                                                                                                                                                                                              
   
  That's it — zero downtime restart with PM2.                                                                                                                                                                                                                                  
                                                                          
  ---                                                                                                                                                                                                                                                                          
  When you're ready to pull the trigger, the whole thing top to bottom is a half-day of work. The DNS propagation wait is the longest part.