-- Current CPF Ordinary Account balance per partner (cents), used to project the OA available at each BTO stage.
-- Written only through the server like every other profile field.
alter table public.profiles add column cpf_oa integer;
