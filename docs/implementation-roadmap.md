# Implementation Roadmap

Fonte: `docs/produto.txt` e `docs/tecnico.txt`.

## Decisoes ja assumidas

- Backend em Node.js + TypeScript.
- Arquitetura modular com `domain`, `application`, `infrastructure` e `modules`.
- Supabase/Postgres como banco principal.
- WAHA como integracao WhatsApp inicial.
- Valores financeiros sempre em centavos.
- Soft delete e auditoria para acoes financeiras.
- Timezone de negocio: `America/Sao_Paulo`; persistencia em UTC.
- Plano gratis com limite de 5 lancamentos diarios.
- Planejamento agricola impactado pelo valor total da compra.
- Fluxo de caixa impactado mes a mes pelas parcelas.
- Relatorio diario somente para usuarios pagantes.

## Proximos marcos

1. Conectar repositorios Supabase aos use cases.
2. Implementar onboarding conversacional por WhatsApp.
3. Implementar CRUD de transacoes com auditoria e confirmacao para editar/excluir.
4. Implementar planejamento de safra e itens de orcamento.
5. Gerar alertas persistidos em 50%, 80%, 100% e estouro.
6. Implementar cartoes, compras parceladas e relatorio por cartao.
7. Implementar job real do relatorio diario das 7h.
8. Implementar gateway de pagamento escolhido e webhook de assinatura.
9. Criar dashboard interno basico.

## Pontos ainda em aberto

- Gateway de pagamento definitivo.
- Se o processamento de IA ficara no backend, n8n ou hibrido.
- Provedor final de WhatsApp: WAHA, Uazapi, Evolution ou Meta oficial.
- Estrategia de backup/exportacao de dados do usuario.
- Politica detalhada para categorias fora do planejamento.

