INSERT INTO categories (name, slug) VALUES
('Imirire', 'nutrition'),
('Umuvuduko w\'amaraso', 'blood-pressure'),
('Diyabete', 'diabetes'),
('Umutima', 'heart-health');

INSERT INTO content (category_id, title, summary, body, audio_url, status) VALUES
(2, 'Umuvuduko w\'amaraso ni iki?', 'Kumenya ibimenyetso n\'ukugabanya ibyago.', 'Umuvuduko w\'amaraso ni igipimo cy\'amaraso y\'ingome mu mitsi. Umuvuduko ukabije utuma umutima ukora cyane. Icyo ushobora gukora: kugabanya umunyu, gukora imyitozo, no kwipimisha.', '/audio/blood-pressure.mp3', 'published'),
(3, 'Diyabete n\'ubuzima', 'Kurinda ubuzima bwawe no kumuha amafunguro meza.', 'Diyabete irashobora kugaragara nk\'ibimenyetso by\'inyota, isoni, no gucika intege. Koresha ibiryo bifite isukari nkeya, ugende, kandi ushyireho amahugurwa.', '/audio/diabetes.mp3', 'published'),
(1, 'Imirire myiza', 'Ibiribwa byiza byiza ku buzima.', 'Kurya ibiryo bikwiranye, ibiryo byuzuye ibinure byiza, imbuto, ibikoresho bitanga ibinure, bikurura ubuzima bwiza mu mubiri.', '/audio/nutrition.mp3', 'published');

INSERT INTO faqs (question, answer) VALUES
('Baho ikora gute?', 'Baho itanga ibitabo by\'amajwi, amakuru y\'ubuzima, ibibutsa, hamwe n\'imyitozo igamije kurinda indwara zidakira.'),
('Ese Baho ifasha mu Kinyarwanda?', 'Yego, ibirimo byose byateguwe mu Kinyarwanda kugira ngo abantu babashe kubibasha byoroshye.'),
('Nshobora gukoresha Baho ntar internet?', 'Yego, ibice byinshi birashobora guhabwa uburenganzira bwo kujya mu buryo bw\'internet.' );
