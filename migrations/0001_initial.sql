create table if not exists events (
  id text primary key,
  token text not null unique,
  title text not null,
  currency text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists participants (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  display_name text not null,
  sort_order integer not null,
  created_at text not null
);

create index if not exists participants_event_order_idx on participants(event_id, sort_order);

create table if not exists expenses (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  description text not null,
  amount_minor integer not null,
  payer_participant_id text not null references participants(id),
  created_at text not null,
  updated_at text not null
);

create index if not exists expenses_event_created_idx on expenses(event_id, created_at desc);

create table if not exists shares (
  id text primary key,
  expense_id text not null references expenses(id) on delete cascade,
  participant_id text not null references participants(id),
  amount_minor integer not null,
  unique(expense_id, participant_id)
);

create table if not exists settlement_payments (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  sender_participant_id text not null references participants(id),
  recipient_participant_id text not null references participants(id),
  amount_minor integer not null,
  created_at text not null,
  updated_at text not null
);

create index if not exists settlement_payments_event_created_idx
  on settlement_payments(event_id, created_at desc);
