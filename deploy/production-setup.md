# Deploy de producao

Este guia assume que a VPS ja tem Docker, Git, Nginx, Certbot e firewall liberando 80/443.

## 1. Atualizar codigo

```bash
cd /opt/redeas
git pull
```

## 2. Criar arquivos de ambiente

```bash
cp .env.production.example .env.production
cp .env.waha.example .env.waha
```

Preencha `.env.production`:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WAHA_API_KEY=mesma_chave_do_.env.waha
PAGARME_API_KEY=
AGENT_API_KEY=
```

Preencha `.env.waha`:

```text
WAHA_API_KEY=gere_uma_chave_longa
WAHA_API_KEY_PLAIN=mesma_chave_do_WAHA_API_KEY
WAHA_DASHBOARD_PASSWORD=gere_uma_senha_longa
```

## 3. Subir API e WAHA

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

## 4. Configurar Nginx

```bash
sudo cp deploy/nginx/api.redeas.online.conf /etc/nginx/sites-available/api.redeas.online
sudo cp deploy/nginx/waha.redeas.online.conf /etc/nginx/sites-available/waha.redeas.online
sudo ln -s /etc/nginx/sites-available/api.redeas.online /etc/nginx/sites-enabled/api.redeas.online
sudo ln -s /etc/nginx/sites-available/waha.redeas.online /etc/nginx/sites-enabled/waha.redeas.online
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Emitir HTTPS

```bash
sudo certbot --nginx -d api.redeas.online -d waha.redeas.online
```

## 6. Testar API

```bash
curl https://api.redeas.online/health
```

## 7. Resolver migrations Supabase

Se o `db push` acusar migrations remotas antigas que nao existem no repo local:

```bash
npx supabase migration list
npx supabase migration repair --status reverted 20260625100000 20260628193000 20260628203000 20260630120000
npx supabase db push
```

Depois disso, a migration `003_e2e_whatsapp_test_seed.sql` cria o numero de teste `5544999999999` como ativo.

## 8. Conectar WhatsApp

Acesse:

```text
https://waha.redeas.online/dashboard
```

Use usuario `admin`, a senha do `.env.waha` e a API key do `.env.waha`.

Inicie a sessao `default`, escaneie o QR Code e confirme que o status ficou `WORKING`.

## 9. Teste ponta a ponta

Envie mensagem pelo WhatsApp conectado:

```text
gastei R$ 50 em diesel
```

Verifique logs:

```bash
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f waha
```
