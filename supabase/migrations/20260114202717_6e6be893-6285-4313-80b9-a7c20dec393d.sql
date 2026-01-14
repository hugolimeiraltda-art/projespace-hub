-- Add data_termino column to allow manual override of end date
ALTER TABLE public.customer_portfolio
ADD COLUMN data_termino date;