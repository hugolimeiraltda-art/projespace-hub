
UPDATE public.profiles SET filial='BHZ', filiais=ARRAY['BHZ']::text[] WHERE id='9a836984-f1fd-4310-85cc-80d023549c8b';
DELETE FROM public.user_roles WHERE user_id='9a836984-f1fd-4310-85cc-80d023549c8b';
INSERT INTO public.user_roles (user_id, role) VALUES ('9a836984-f1fd-4310-85cc-80d023549c8b','admin');
DELETE FROM public.user_menu_overrides WHERE user_id='9a836984-f1fd-4310-85cc-80d023549c8b';
