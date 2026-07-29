import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("e/:token", "routes/event-layout.tsx", [
    index("routes/event-index.tsx"),
    route("expenses", "routes/expenses.tsx", [
      route("new", "routes/expense-new.tsx"),
      route(":expenseId/edit", "routes/expense-edit.tsx"),
    ]),
    route("settle", "routes/settle.tsx", [
      route("new", "routes/payment-new.tsx"),
      route(":paymentId/edit", "routes/payment-edit.tsx"),
    ]),
    route("people", "routes/people.tsx", [
      route("new", "routes/person-new.tsx"),
      route(":participantId/edit", "routes/person-edit.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
