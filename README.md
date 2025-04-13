## Schemas Pré-definidos

Use os utilitários para criar schemas consistentes:

```typescript
// Exemplo de schema com customizações
const productSchema = z.object({
  id: commonSchemas.uuid("Product identifier"),
  name: z.string().min(3),
  price: z.number().positive(),
  stock: commonSchemas.pagination({ maxLimit: 200 }).shape.limit,
});

// Paginação personalizada
const strictPagination = commonSchemas.pagination({
  defaultPage: 1,
  maxLimit: 25,
});

// Resposta de erro com códigos específicos
const errorSchema = commonSchemas.errorResponse([
  "invalid_request",
  "rate_limit_exceeded",
]);
```
