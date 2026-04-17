insert into public.game_sets (id, title, description, image_path, total_items)
values (
  '11111111-1111-1111-1111-111111111111',
  'Living Room Object Quiz 01',
  'Guess the English names of the numbered objects in the room.',
  'game-sets/placeholder-living-room-01.png',
  10
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  image_path = excluded.image_path,
  total_items = excluded.total_items;

insert into public.game_set_answers (game_set_id, item_number, answer_text, accepted_aliases)
values
  ('11111111-1111-1111-1111-111111111111', 1, 'sofa', array['couch']),
  ('11111111-1111-1111-1111-111111111111', 2, 'floor lamp', array['lamp', 'standing lamp']),
  ('11111111-1111-1111-1111-111111111111', 3, 'vase', array[]::text[]),
  ('11111111-1111-1111-1111-111111111111', 4, 'mug', array['cup']),
  ('11111111-1111-1111-1111-111111111111', 5, 'remote control', array['remote']),
  ('11111111-1111-1111-1111-111111111111', 6, 'television', array['tv', 'television', 'television set']),
  ('11111111-1111-1111-1111-111111111111', 7, 'wall clock', array['clock']),
  ('11111111-1111-1111-1111-111111111111', 8, 'armchair', array['chair', 'lounge chair']),
  ('11111111-1111-1111-1111-111111111111', 9, 'rug', array['carpet']),
  ('11111111-1111-1111-1111-111111111111', 10, 'cabinet', array['sideboard', 'console cabinet'])
on conflict (game_set_id, item_number) do update
set
  answer_text = excluded.answer_text,
  accepted_aliases = excluded.accepted_aliases;
