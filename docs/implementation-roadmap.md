# Implementation Roadmap

Fonte: `docs/produto.txt` e `docs/tecnico.txt`.

## Decisões já assumidas

- Backend em Node.js + TypeScript.
- Arquitetura modular com `domain`, `application`, `infrastructure` e `modules`.
- Supabase/Postgres como banco principal.
- WAHA como integração WhatsApp inicial.
- Valores financeiros sempre em centavos.
- Soft delete e auditoria para ações financeiras.
- Timezone de negócio: `America/Sao_Paulo`; persistência em UTC.
- Plano grátis com limite de 5 lançamentos diários.
- Planejamento agrícola impactado pelo valor total da compra.
- Fluxo de caixa impactado mês a mês pelas parcelas.
- Relatório diário somente para usuários pagantes.

## Próximos marcos

1. Conectar repositórios Supabase aos use cases.
2. Implementar onboarding conversacional por WhatsApp.
3. Implementar CRUD de transações com auditoria e confirmação para editar/excluir.
4. Implementar planejamento de safra e itens de orçamento.
5. Gerar alertas persistidos em 50%, 80%, 100% e estouro.
6. Implementar cartões, compras parceladas e relatório por cartão.
7. Implementar job real do relatório diário das 7h.
8. Implementar gateway de pagamento escolhido e webhook de assinatura.
9. Criar dashboard interno básico.

## Pontos ainda em aberto

- Gateway de pagamento definitivo.
- Se o processamento de IA ficará no backend, n8n ou híbrido.
- Provedor final de WhatsApp: WAHA, Uazapi, Evolution ou Meta oficial.
- Estratégia de backup/exportação de dados do usuário.
- Política detalhada para categorias fora do planejamento.
