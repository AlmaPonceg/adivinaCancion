/**
 * djCatalog.js
 * Curated library of iconic party songs for birthday trivia, organized by genre, decade, and language.
 * Contains over 250 curated anthems across all genres with non-repetition support.
 */

export const DJ_CATALOG = {
  rock_nacional: {
    name: 'Rock Nacional Argentino',
    songs: [
      { q: 'Soda Stereo De Musica Ligera', title: 'De Música Ligera', artist: 'Soda Stereo', decade: '90s', lang: 'es' },
      { q: 'Soda Stereo Cuando Pase El Temblor', title: 'Cuando Pase El Temblor', artist: 'Soda Stereo', decade: '80s', lang: 'es' },
      { q: 'Soda Stereo Tratame Suavemente', title: 'Trátame Suavemente', artist: 'Soda Stereo', decade: '80s', lang: 'es' },
      { q: 'Soda Stereo Nada Personal', title: 'Nada Personal', artist: 'Soda Stereo', decade: '80s', lang: 'es' },
      { q: 'Soda Stereo Persiana Americana', title: 'Persiana Americana', artist: 'Soda Stereo', decade: '80s', lang: 'es' },
      { q: 'Soda Stereo En La Ciudad De La Furia', title: 'En La Ciudad De La Furia', artist: 'Soda Stereo', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Demoliendo Hoteles', title: 'Demoliendo Hoteles', artist: 'Charly García', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Promesas Sobre El Bidet', title: 'Promesas Sobre El Bidet', artist: 'Charly García', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Yendo De La Cama Al Living', title: 'Yendo De La Cama Al Living', artist: 'Charly García', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Rezo Por Vos', title: 'Rezo Por Vos', artist: 'Charly García & Spinetta', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Cerca De La Revolucion', title: 'Cerca De La Revolución', artist: 'Charly García', decade: '80s', lang: 'es' },
      { q: 'Charly Garcia Hablando A Tu Corazon', title: 'Hablando A Tu Corazón', artist: 'Charly García & Pedro Aznar', decade: '80s', lang: 'es' },
      { q: 'Los Piojos Verano del 92', title: 'Verano Del 92', artist: 'Los Piojos', decade: '90s', lang: 'es' },
      { q: 'Los Piojos Tan Solo', title: 'Tan Solo', artist: 'Los Piojos', decade: '90s', lang: 'es' },
      { q: 'Los Piojos Bicho De Ciudad', title: 'Bicho De Ciudad', artist: 'Los Piojos', decade: '2000s', lang: 'es' },
      { q: 'Los Piojos Como Ali', title: 'Como Alí', artist: 'Los Piojos', decade: '2000s', lang: 'es' },
      { q: 'Los Piojos Ruleta', title: 'Ruleta', artist: 'Los Piojos', decade: '2000s', lang: 'es' },
      { q: 'Patricio Rey Jijiji', title: 'Ji Ji Ji', artist: 'Patricio Rey y sus Redonditos de Ricota', decade: '80s', lang: 'es' },
      { q: 'Patricio Rey La Bestia Pop', title: 'La Bestia Pop', artist: 'Patricio Rey y sus Redonditos de Ricota', decade: '80s', lang: 'es' },
      { q: 'Patricio Rey Un Poco De Amor Frances', title: 'Un Poco De Amor Francés', artist: 'Patricio Rey', decade: '90s', lang: 'es' },
      { q: 'Patricio Rey Mi Perro Dinamita', title: 'Mi Perro Dinamita', artist: 'Patricio Rey', decade: '90s', lang: 'es' },
      { q: 'Fito Paez El Amor Despues Del Amor', title: 'El Amor Después Del Amor', artist: 'Fito Páez', decade: '90s', lang: 'es' },
      { q: 'Fito Paez Mariposa Tecknicolor', title: 'Mariposa Tecknicolor', artist: 'Fito Páez', decade: '90s', lang: 'es' },
      { q: 'Fito Paez 11 y 6', title: '11 y 6', artist: 'Fito Páez', decade: '80s', lang: 'es' },
      { q: 'Fito Paez A Rodar Mi Vida', title: 'A Rodar Mi Vida', artist: 'Fito Páez', decade: '90s', lang: 'es' },
      { q: 'Fito Paez Circo Beat', title: 'Circo Beat', artist: 'Fito Páez', decade: '90s', lang: 'es' },
      { q: 'Andres Calamaro Flaca', title: 'Flaca', artist: 'Andrés Calamaro', decade: '90s', lang: 'es' },
      { q: 'Andres Calamaro Mil Horas', title: 'Mil Horas', artist: 'Los Abuelos de la Nada', decade: '80s', lang: 'es' },
      { q: 'Andres Calamaro Loco', title: 'Loco', artist: 'Andrés Calamaro', decade: '90s', lang: 'es' },
      { q: 'Andres Calamaro Sin Documentos', title: 'Sin Documentos', artist: 'Los Rodríguez', decade: '90s', lang: 'es' },
      { q: 'Andres Calamaro Te Quiero Igual', title: 'Te Quiero Igual', artist: 'Andrés Calamaro', decade: '90s', lang: 'es' },
      { q: 'Babasonicos Putita', title: 'Putita', artist: 'Babasónicos', decade: '2000s', lang: 'es' },
      { q: 'Babasonicos Irresponsables', title: 'Irresponsables', artist: 'Babasónicos', decade: '2000s', lang: 'es' },
      { q: 'Babasonicos El Colmo', title: 'El Colmo', artist: 'Babasónicos', decade: '2000s', lang: 'es' },
      { q: 'Babasonicos Y Que', title: '¿Y Qué?', artist: 'Babasónicos', decade: '2000s', lang: 'es' },
      { q: 'Gustavo Cerati Crimen', title: 'Crimen', artist: 'Gustavo Cerati', decade: '2000s', lang: 'es' },
      { q: 'Gustavo Cerati Puente', title: 'Puente', artist: 'Gustavo Cerati', decade: '90s', lang: 'es' },
      { q: 'Gustavo Cerati Deja Vu', title: 'Déjà Vu', artist: 'Gustavo Cerati', decade: '2000s', lang: 'es' },
      { q: 'Gustavo Cerati Cosas Imposibles', title: 'Cosas Imposibles', artist: 'Gustavo Cerati', decade: '2000s', lang: 'es' },
      { q: 'Virus Luna De Miel En La Mano', title: 'Luna De Miel En La Mano', artist: 'Virus', decade: '80s', lang: 'es' },
      { q: 'Virus Imagenes Paganas', title: 'Imágenes Paganas', artist: 'Virus', decade: '80s', lang: 'es' },
      { q: 'Virus Pronta Entrega', title: 'Pronta Entrega', artist: 'Virus', decade: '80s', lang: 'es' },
      { q: 'Los Autenticos Decadentes Loco Tu Forma De Ser', title: 'Loco (Tu Forma De Ser)', artist: 'Los Auténticos Decadentes', decade: '80s', lang: 'es' },
      { q: 'Los Autenticos Decadentes Corazon', title: 'Corazón', artist: 'Los Auténticos Decadentes', decade: '90s', lang: 'es' },
      { q: 'Los Autenticos Decadentes La Guitarra', title: 'La Guitarra', artist: 'Los Auténticos Decadentes', decade: '90s', lang: 'es' },
      { q: 'Los Fabulosos Cadillacs Matador', title: 'Matador', artist: 'Los Fabulosos Cadillacs', decade: '90s', lang: 'es' },
      { q: 'Los Fabulosos Cadillacs Vasos Vacios', title: 'Vasos Vacíos', artist: 'Los Fabulosos Cadillacs & Celia Cruz', decade: '80s', lang: 'es' },
      { q: 'Airbag Solo Aqui', title: 'Solo Aquí', artist: 'Airbag', decade: '2000s', lang: 'es' },
      { q: 'Airbag Por Mil Noches', title: 'Por Mil Noches', artist: 'Airbag', decade: '2010s', lang: 'es' },
      { q: 'Ciro y los Persas Antes y Despues', title: 'Antes y Después', artist: 'Ciro y los Persas', decade: '2010s', lang: 'es' },
      { q: 'Enanitos Verdes Lamento Boliviano', title: 'Lamento Boliviano', artist: 'Los Enanitos Verdes', decade: '90s', lang: 'es' },
      { q: 'Enanitos Verdes La Muralla Verde', title: 'La Muralla Verde', artist: 'Los Enanitos Verdes', decade: '80s', lang: 'es' },
      { q: 'Bersuit Vergarabat Se Viene', title: 'Se Viene', artist: 'Bersuit Vergarabat', decade: '90s', lang: 'es' },
      { q: 'Bersuit Vergarabat Yo Tomo', title: 'Yo Tomo', artist: 'Bersuit Vergarabat', decade: '90s', lang: 'es' },
      { q: 'Bersuit Vergarabat Mi Caramelo', title: 'Mi Caramelo', artist: 'Bersuit Vergarabat', decade: '90s', lang: 'es' },
      { q: 'Intoxicados Esta Saliendo El Sol', title: 'Está Saliendo El Sol', artist: 'Intoxicados', decade: '2000s', lang: 'es' },
      { q: 'Intoxicados Fuego', title: 'Fuego', artist: 'Intoxicados', decade: '2000s', lang: 'es' },
      { q: 'Intoxicados Nunca Quise', title: 'Nunca Quise', artist: 'Intoxicados', decade: '2000s', lang: 'es' },
      { q: 'La Renga La Balada Del Diablo y La Muerte', title: 'La Balada Del Diablo y La Muerte', artist: 'La Renga', decade: '90s', lang: 'es' },
      { q: 'La Renga El Revelde', title: 'El Revelde', artist: 'La Renga', decade: '90s', lang: 'es' },
      { q: 'Tan Bionica Ciudad Magica', title: 'Ciudad Mágica', artist: 'Tan Biónica', decade: '2010s', lang: 'es' },
      { q: 'Tan Bionica Ella', title: 'Ella', artist: 'Tan Biónica', decade: '2010s', lang: 'es' },
      { q: 'Attaque 77 Hacelo Por Mi', title: 'Hacelo Por Mí', artist: 'Attaque 77', decade: '90s', lang: 'es' },
      { q: 'Divididos Ala Delta', title: 'Ala Delta', artist: 'Divididos', decade: '90s', lang: 'es' },
      { q: 'Spinetta Seguir Viviendo Sin Tu Amor', title: 'Seguir Viviendo Sin Tu Amor', artist: 'Luis Alberto Spinetta', decade: '90s', lang: 'es' },
    ],
  },

  cumbia_cuarteto: {
    name: 'Cumbia y Cuarteto',
    songs: [
      { q: 'Rodrigo La Mano De Dios', title: 'La Mano De Dios', artist: 'Rodrigo', decade: '2000s', lang: 'es' },
      { q: 'Rodrigo Ocho Cuarenta', title: 'Ocho Cuarenta', artist: 'Rodrigo', decade: '2000s', lang: 'es' },
      { q: 'Rodrigo Soy Cordobes', title: 'Soy Cordobés', artist: 'Rodrigo', decade: '90s', lang: 'es' },
      { q: 'Rodrigo Lo Mejor Del Amor', title: 'Lo Mejor Del Amor', artist: 'Rodrigo', decade: '90s', lang: 'es' },
      { q: 'Rodrigo Como Le Digo', title: 'Cómo Le Digo', artist: 'Rodrigo', decade: '90s', lang: 'es' },
      { q: 'Rodrigo Que Ironia', title: 'Qué Ironía', artist: 'Rodrigo', decade: '2000s', lang: 'es' },
      { q: 'Los Palmeras El Bombon Asesino', title: 'El Bombón Asesino', artist: 'Los Palmeras', decade: '2000s', lang: 'es' },
      { q: 'Los Palmeras Olvidala', title: 'Olvídata', artist: 'Los Palmeras', decade: '2000s', lang: 'es' },
      { q: 'Los Palmeras Soy Sabalero', title: 'Soy Sabalero', artist: 'Los Palmeras', decade: '2010s', lang: 'es' },
      { q: 'Los Palmeras Perra', title: 'Perra', artist: 'Los Palmeras', decade: '90s', lang: 'es' },
      { q: 'Los Palmeras La Suavecita', title: 'La Suavecita', artist: 'Los Palmeras', decade: '80s', lang: 'es' },
      { q: 'Walter Olmos Por Lo Que Yo Te Quiero', title: 'Por Lo Que Yo Te Quiero', artist: 'Walter Olmos', decade: '2000s', lang: 'es' },
      { q: 'Walter Olmos Amor Fugitivo', title: 'Amor Fugitivo', artist: 'Walter Olmos', decade: '2000s', lang: 'es' },
      { q: 'La Mona Jimenez Quien Se Ha Tomado Todo El Vino', title: 'Quién Se Ha Tomado Todo El Vino', artist: 'La Mona Jiménez', decade: '80s', lang: 'es' },
      { q: 'La Mona Jimenez Beso A Beso', title: 'Beso A Beso', artist: 'La Mona Jiménez', decade: '90s', lang: 'es' },
      { q: 'La Mona Jimenez Amor De Compra y Venta', title: 'Amor De Compra y Venta', artist: 'La Mona Jiménez', decade: '90s', lang: 'es' },
      { q: 'Gilda No Me Arrepiento De Este Amor', title: 'No Me Arrepiento De Este Amor', artist: 'Gilda', decade: '90s', lang: 'es' },
      { q: 'Gilda Fuiste', title: 'Fuiste', artist: 'Gilda', decade: '90s', lang: 'es' },
      { q: 'Gilda Se Me Ha Perdido Un Corazon', title: 'Se Me Ha Perdido Un Corazón', artist: 'Gilda', decade: '90s', lang: 'es' },
      { q: 'Gilda Paisaje', title: 'Paisaje', artist: 'Gilda', decade: '90s', lang: 'es' },
      { q: 'Gilda Corazon Valiente', title: 'Corazón Valiente', artist: 'Gilda', decade: '90s', lang: 'es' },
      { q: 'Damas Gratis Se Te Ve La Tanga', title: 'Se Te Ve La Tanga', artist: 'Damas Gratis', decade: '2000s', lang: 'es' },
      { q: 'Damas Gratis No Te Creas Tan Importante', title: 'No Te Creas Tan Importante', artist: 'Damas Gratis', decade: '2010s', lang: 'es' },
      { q: 'Damas Gratis Me Vas A Extrañar', title: 'Me Vas A Extrañar', artist: 'Damas Gratis & Viru Kumbieron', decade: '2010s', lang: 'es' },
      { q: 'Damas Gratis El Humo De Mi Fasito', title: 'El Humo De Mi Fasito', artist: 'Damas Gratis', decade: '2000s', lang: 'es' },
      { q: 'Rafaga Mentirosa', title: 'Mentirosa', artist: 'Ráfaga', decade: '90s', lang: 'es' },
      { q: 'Rafaga Una Cerveza', title: 'Una Cerveza', artist: 'Ráfaga', decade: '2010s', lang: 'es' },
      { q: 'Rafaga La Luna y Tu', title: 'La Luna y Tú', artist: 'Ráfaga', decade: '90s', lang: 'es' },
      { q: 'La Konga Universo Paralelo', title: 'Universo Paralelo', artist: 'La K\'onga & Nahuel Pennisi', decade: '2020s', lang: 'es' },
      { q: 'La Konga Ya No Vuelvas', title: 'Ya No Vuelvas', artist: 'Luck Ra & La K\'onga', decade: '2020s', lang: 'es' },
      { q: 'La Konga Te Mentiria', title: 'Te Mentiría', artist: 'La K\'onga', decade: '2020s', lang: 'es' },
      { q: 'La Konga La Cabana', title: 'La Cabaña', artist: 'La K\'onga', decade: '2010s', lang: 'es' },
      { q: 'Ke Personajes Un Finde', title: 'Un Finde', artist: 'Ke Personajes & FMK & Big One', decade: '2020s', lang: 'es' },
      { q: 'Ke Personajes Ojitos Rojos', title: 'Ojitos Rojos', artist: 'Ke Personajes', decade: '2020s', lang: 'es' },
      { q: 'Ke Personajes Costumbres', title: 'Costumbres', artist: 'Ke Personajes', decade: '2020s', lang: 'es' },
      { q: 'Ke Personajes Adicto', title: 'Adicto', artist: 'Ke Personajes', decade: '2020s', lang: 'es' },
      { q: 'Luck Ra La Morocha', title: 'La Morocha', artist: 'Luck Ra & BM', decade: '2020s', lang: 'es' },
      { q: 'Luck Ra Hola Perdida', title: 'Hola Perdida', artist: 'Luck Ra & Khea', decade: '2020s', lang: 'es' },
      { q: 'Luck Ra Que Me Falte Todo', title: 'Que Me Falte Todo', artist: 'Luck Ra & Abel Pintos', decade: '2020s', lang: 'es' },
      { q: 'Ulises Bueno Intento', title: 'Intento', artist: 'Ulises Bueno', decade: '2010s', lang: 'es' },
      { q: 'Ulises Bueno Dale Vieja Dale', title: 'Dale Vieja Dale', artist: 'Ulises Bueno', decade: '2010s', lang: 'es' },
      { q: 'Karina Corazon Mentiroso', title: 'Corazón Mentiroso', artist: 'Karina La Princesita', decade: '2000s', lang: 'es' },
      { q: 'Karina Con La Misma Moneda', title: 'Con La Misma Moneda', artist: 'Karina La Princesita', decade: '2000s', lang: 'es' },
      { q: 'Karina Fuera', title: 'Fuera', artist: 'Karina La Princesita', decade: '2010s', lang: 'es' },
      { q: 'Leo Mattioli Le Pido A Dios', title: 'Le Pido A Dios', artist: 'Leo Mattioli', decade: '2000s', lang: 'es' },
      { q: 'Leo Mattioli Tramposa', title: 'Tramposa', artist: 'Leo Mattioli', decade: '2000s', lang: 'es' },
      { q: 'Antonio Rios Nunca Me Faltes', title: 'Nunca Me Faltes', artist: 'Antonio Ríos', decade: '90s', lang: 'es' },
      { q: 'Daniel Agostini La Ventanita', title: 'La Ventanita', artist: 'Daniel Agostini', decade: '90s', lang: 'es' },
      { q: 'Amar Azul Yo Tomo Licor', title: 'Yo Tomo Licor', artist: 'Amar Azul', decade: '90s', lang: 'es' },
      { q: 'Amar Azul El Polvito Del Amor', title: 'El Polvito Del Amor', artist: 'Amar Azul', decade: '90s', lang: 'es' },
      { q: 'Commanche Tonta', title: 'Tonta', artist: 'Commanche', decade: '90s', lang: 'es' },
      { q: 'Tambo Tambo El Campanero', title: 'El Campanero', artist: 'Tambó Tambó', decade: '90s', lang: 'es' },
      { q: 'Tambo Tambo Falsas Promesas', title: 'Falsas Promesas', artist: 'Tambó Tambó', decade: '90s', lang: 'es' },
      { q: 'Jambao Se Parece Mas A Ti', title: 'Se Parece Más A Ti', artist: 'Jambao', decade: '2000s', lang: 'es' },
      { q: 'Pibes Chorros Sentimiento Villero', title: 'Sentimiento Villero', artist: 'Pibes Chorros', decade: '2000s', lang: 'es' },
    ],
  },

  pop_latino: {
    name: 'Pop y Urbano Latino',
    songs: [
      { q: 'Miranda Don', title: 'Don (Es la guitarra de Lolo)', artist: 'Miranda!', decade: '2000s', lang: 'es' },
      { q: 'Miranda Perfecta', title: 'Perfecta', artist: 'Miranda!', decade: '2000s', lang: 'es' },
      { q: 'Miranda Yo Te Dire', title: 'Yo Te Diré', artist: 'Miranda!', decade: '2000s', lang: 'es' },
      { q: 'Miranda Prisionero', title: 'Prisionero', artist: 'Miranda!', decade: '2000s', lang: 'es' },
      { q: 'Miranda Enamorada', title: 'Enamorada', artist: 'Miranda!', decade: '2000s', lang: 'es' },
      { q: 'Shakira Hips Dont Lie', title: 'Hips Don\'t Lie', artist: 'Shakira', decade: '2000s', lang: 'es' },
      { q: 'Shakira Ciega Sordomuda', title: 'Ciega, Sordomuda', artist: 'Shakira', decade: '90s', lang: 'es' },
      { q: 'Shakira Antologia', title: 'Antología', artist: 'Shakira', decade: '90s', lang: 'es' },
      { q: 'Shakira Ojos Asi', title: 'Ojos Así', artist: 'Shakira', decade: '90s', lang: 'es' },
      { q: 'Shakira Inevitable', title: 'Inevitable', artist: 'Shakira', decade: '90s', lang: 'es' },
      { q: 'Shakira Suerte Whenever Wherever', title: 'Suerte', artist: 'Shakira', decade: '2000s', lang: 'es' },
      { q: 'Chayanne Torero', title: 'Torero', artist: 'Chayanne', decade: '2000s', lang: 'es' },
      { q: 'Chayanne Provocame', title: 'Provócame', artist: 'Chayanne', decade: '90s', lang: 'es' },
      { q: 'Chayanne Dejaria Todo', title: 'Dejaría Todo', artist: 'Chayanne', decade: '90s', lang: 'es' },
      { q: 'Chayanne Salomé', title: 'Salomé', artist: 'Chayanne', decade: '90s', lang: 'es' },
      { q: 'Ricky Martin Livin La Vida Loca', title: 'Livin\' La Vida Loca', artist: 'Ricky Martin', decade: '90s', lang: 'es' },
      { q: 'Ricky Martin La Mordidita', title: 'La Mordidita', artist: 'Ricky Martin', decade: '2010s', lang: 'es' },
      { q: 'Ricky Martin Vente Pa Ca', title: 'Vente Pa\' Ca', artist: 'Ricky Martin & Maluma', decade: '2010s', lang: 'es' },
      { q: 'Luis Miguel Ahora Te Puedes Marchar', title: 'Ahora Te Puedes Marchar', artist: 'Luis Miguel', decade: '80s', lang: 'es' },
      { q: 'Luis Miguel La Incondicional', title: 'La Incondicional', artist: 'Luis Miguel', decade: '80s', lang: 'es' },
      { q: 'Luis Miguel Cuando Calienta El Sol', title: 'Cuando Calienta El Sol', artist: 'Luis Miguel', decade: '80s', lang: 'es' },
      { q: 'Luis Miguel Suave', title: 'Suave', artist: 'Luis Miguel', decade: '90s', lang: 'es' },
      { q: 'David Bisbal Ave Maria', title: 'Ave María', artist: 'David Bisbal', decade: '2000s', lang: 'es' },
      { q: 'David Bisbal Buleria', title: 'Bulería', artist: 'David Bisbal', decade: '2000s', lang: 'es' },
      { q: 'Julieta Venegas Limon y Sal', title: 'Limón y Sal', artist: 'Julieta Venegas', decade: '2000s', lang: 'es' },
      { q: 'Julieta Venegas Me Voy', title: 'Me Voy', artist: 'Julieta Venegas', decade: '2000s', lang: 'es' },
      { q: 'Julieta Venegas Andar Conmigo', title: 'Andar Conmigo', artist: 'Julieta Venegas', decade: '2000s', lang: 'es' },
      { q: 'Cristian Castro Azul', title: 'Azul', artist: 'Cristian Castro', decade: '2000s', lang: 'es' },
      { q: 'Cristian Castro Lloviendo Estrellas', title: 'Lloviendo Estrellas', artist: 'Cristian Castro', decade: '2000s', lang: 'es' },
      { q: 'Paulina Rubio Y Yo Sigo Aqui', title: 'Y Yo Sigo Aquí', artist: 'Paulina Rubio', decade: '2000s', lang: 'es' },
      { q: 'Paulina Rubio Ni Una Sola Palabra', title: 'Ni Una Sola Palabra', artist: 'Paulina Rubio', decade: '2000s', lang: 'es' },
      { q: 'Thalia Piel Morena', title: 'Piel Morena', artist: 'Thalía', decade: '90s', lang: 'es' },
      { q: 'Thalia Amor A La Mexicana', title: 'Amor A La Mexicana', artist: 'Thalía', decade: '90s', lang: 'es' },
      { q: 'Juanes La Camisa Negra', title: 'La Camisa Negra', artist: 'Juanes', decade: '2000s', lang: 'es' },
      { q: 'Juanes A Dios Le Pido', title: 'A Dios Le Pido', artist: 'Juanes', decade: '2000s', lang: 'es' },
      { q: 'Duki She Dont Give a Fo', title: 'She Don\'t Give a FO', artist: 'Duki & Khea', decade: '2010s', lang: 'es' },
      { q: 'Duki Goteo', title: 'Goteo', artist: 'Duki', decade: '2010s', lang: 'es' },
      { q: 'Duki Hello Cotto', title: 'Hello Cotto', artist: 'Duki', decade: '2010s', lang: 'es' },
      { q: 'Emilia La Original mp3', title: 'La_Original.mp3', artist: 'Emilia & TINI', decade: '2020s', lang: 'es' },
      { q: 'Emilia Cuatro Veinte', title: 'Cuatro Veinte', artist: 'Emilia', decade: '2020s', lang: 'es' },
      { q: 'Emilia Jagger mp3', title: 'JAGGER.mp3', artist: 'Emilia', decade: '2020s', lang: 'es' },
      { q: 'Tini Mienteme', title: 'Miénteme', artist: 'TINI & Maria Becerra', decade: '2020s', lang: 'es' },
      { q: 'Tini La Triple T', title: 'La Triple T', artist: 'TINI', decade: '2020s', lang: 'es' },
      { q: 'Tini Cupido', title: 'Cupido', artist: 'TINI', decade: '2020s', lang: 'es' },
      { q: 'Maria Becerra Automatico', title: 'Automático', artist: 'Maria Becerra', decade: '2020s', lang: 'es' },
      { q: 'Maria Becerra Corazon Vacio', title: 'Corazón Vacío', artist: 'Maria Becerra', decade: '2020s', lang: 'es' },
      { q: 'Maria Becerra Ojala', title: 'Ojalá', artist: 'Maria Becerra', decade: '2020s', lang: 'es' },
      { q: 'Bizarrap Quevedo Music Sessions 52', title: 'Bzrp Music Sessions #52 (Quédate)', artist: 'Bizarrap & Quevedo', decade: '2020s', lang: 'es' },
      { q: 'Bizarrap Shakira Music Sessions 53', title: 'Bzrp Music Sessions #53', artist: 'Bizarrap & Shakira', decade: '2020s', lang: 'es' },
      { q: 'Bizarrap Nathy Peluso Music Sessions 36', title: 'Bzrp Music Sessions #36', artist: 'Bizarrap & Nathy Peluso', decade: '2020s', lang: 'es' },
      { q: 'Bad Bunny Dakiti', title: 'Dákiti', artist: 'Bad Bunny & Jhayco', decade: '2020s', lang: 'es' },
      { q: 'Bad Bunny Titi Me Pregunto', title: 'Tití Me Preguntó', artist: 'Bad Bunny', decade: '2020s', lang: 'es' },
      { q: 'Bad Bunny Me Porto Bonito', title: 'Me Porto Bonito', artist: 'Bad Bunny & Chencho Corleone', decade: '2020s', lang: 'es' },
      { q: 'Rauw Alejandro Todo De Ti', title: 'Todo De Ti', artist: 'Rauw Alejandro', decade: '2020s', lang: 'es' },
      { q: 'Tiago PZK Entre Nosotros', title: 'Entre Nosotros', artist: 'Tiago PZK & LIT Killah', decade: '2020s', lang: 'es' },
    ],
  },

  internacional_80_90: {
    name: '80s & 90s Internacional (Hits en Inglés)',
    songs: [
      { q: 'Queen Bohemian Rhapsody', title: 'Bohemian Rhapsody', artist: 'Queen', decade: '80s', lang: 'en' },
      { q: 'Queen Dont Stop Me Now', title: 'Don\'t Stop Me Now', artist: 'Queen', decade: '80s', lang: 'en' },
      { q: 'Queen Another One Bites The Dust', title: 'Another One Bites The Dust', artist: 'Queen', decade: '80s', lang: 'en' },
      { q: 'Queen Radio Ga Ga', title: 'Radio Ga Ga', artist: 'Queen', decade: '80s', lang: 'en' },
      { q: 'Queen I Want To Break Free', title: 'I Want To Break Free', artist: 'Queen', decade: '80s', lang: 'en' },
      { q: 'Michael Jackson Billie Jean', title: 'Billie Jean', artist: 'Michael Jackson', decade: '80s', lang: 'en' },
      { q: 'Michael Jackson Beat It', title: 'Beat It', artist: 'Michael Jackson', decade: '80s', lang: 'en' },
      { q: 'Michael Jackson Thriller', title: 'Thriller', artist: 'Michael Jackson', decade: '80s', lang: 'en' },
      { q: 'Michael Jackson Smooth Criminal', title: 'Smooth Criminal', artist: 'Michael Jackson', decade: '80s', lang: 'en' },
      { q: 'Michael Jackson Bad', title: 'Bad', artist: 'Michael Jackson', decade: '80s', lang: 'en' },
      { q: 'ABBA Dancing Queen', title: 'Dancing Queen', artist: 'ABBA', decade: '80s', lang: 'en' },
      { q: 'ABBA Gimme Gimme Gimme', title: 'Gimme! Gimme! Gimme!', artist: 'ABBA', decade: '80s', lang: 'en' },
      { q: 'ABBA Mamma Mia', title: 'Mamma Mia', artist: 'ABBA', decade: '80s', lang: 'en' },
      { q: 'Madonna Like A Prayer', title: 'Like A Prayer', artist: 'Madonna', decade: '80s', lang: 'en' },
      { q: 'Madonna Material Girl', title: 'Material Girl', artist: 'Madonna', decade: '80s', lang: 'en' },
      { q: 'Madonna Like A Virgin', title: 'Like A Virgin', artist: 'Madonna', decade: '80s', lang: 'en' },
      { q: 'Madonna Vogue', title: 'Vogue', artist: 'Madonna', decade: '90s', lang: 'en' },
      { q: 'Guns N Roses Sweet Child O Mine', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', decade: '80s', lang: 'en' },
      { q: 'Guns N Roses Paradise City', title: 'Paradise City', artist: 'Guns N\' Roses', decade: '80s', lang: 'en' },
      { q: 'Bon Jovi Livin On A Prayer', title: 'Livin\' On A Prayer', artist: 'Bon Jovi', decade: '80s', lang: 'en' },
      { q: 'Bon Jovi You Give Love A Bad Name', title: 'You Give Love A Bad Name', artist: 'Bon Jovi', decade: '80s', lang: 'en' },
      { q: 'Bon Jovi Its My Life', title: 'It\'s My Life', artist: 'Bon Jovi', decade: '2000s', lang: 'en' },
      { q: 'a-ha Take On Me', title: 'Take On Me', artist: 'a-ha', decade: '80s', lang: 'en' },
      { q: 'Cyndi Lauper Girls Just Want To Have Fun', title: 'Girls Just Want To Have Fun', artist: 'Cyndi Lauper', decade: '80s', lang: 'en' },
      { q: 'Whitney Houston I Wanna Dance With Somebody', title: 'I Wanna Dance With Somebody', artist: 'Whitney Houston', decade: '80s', lang: 'en' },
      { q: 'Whitney Houston I Will Always Love You', title: 'I Will Always Love You', artist: 'Whitney Houston', decade: '90s', lang: 'en' },
      { q: 'Backstreet Boys Everybody', title: 'Everybody (Backstreet\'s Back)', artist: 'Backstreet Boys', decade: '90s', lang: 'en' },
      { q: 'Backstreet Boys I Want It That Way', title: 'I Want It That Way', artist: 'Backstreet Boys', decade: '90s', lang: 'en' },
      { q: 'Spice Girls Wannabe', title: 'Wannabe', artist: 'Spice Girls', decade: '90s', lang: 'en' },
      { q: 'Britney Spears Baby One More Time', title: '...Baby One More Time', artist: 'Britney Spears', decade: '90s', lang: 'en' },
      { q: 'Britney Spears Oops I Did It Again', title: 'Oops!... I Did It Again', artist: 'Britney Spears', decade: '2000s', lang: 'en' },
      { q: 'Britney Spears Toxic', title: 'Toxic', artist: 'Britney Spears', decade: '2000s', lang: 'en' },
      { q: 'Earth Wind and Fire September', title: 'September', artist: 'Earth, Wind & Fire', decade: '80s', lang: 'en' },
      { q: 'Bee Gees Stayin Alive', title: 'Stayin\' Alive', artist: 'Bee Gees', decade: '80s', lang: 'en' },
      { q: 'Wham Wake Me Up Before You Go Go', title: 'Wake Me Up Before You Go-Go', artist: 'Wham!', decade: '80s', lang: 'en' },
      { q: 'Elton John Im Still Standing', title: 'I\'m Still Standing', artist: 'Elton John', decade: '80s', lang: 'en' },
      { q: 'Toto Africa', title: 'Africa', artist: 'Toto', decade: '80s', lang: 'en' },
      { q: 'Survivor Eye Of The Tiger', title: 'Eye Of The Tiger', artist: 'Survivor', decade: '80s', lang: 'en' },
      { q: 'Rick Astley Never Gonna Give You Up', title: 'Never Gonna Give You Up', artist: 'Rick Astley', decade: '80s', lang: 'en' },
      { q: 'The Police Every Breath You Take', title: 'Every Breath You Take', artist: 'The Police', decade: '80s', lang: 'en' },
      { q: 'Gloria Gaynor I Will Survive', title: 'I Will Survive', artist: 'Gloria Gaynor', decade: '80s', lang: 'en' },
      { q: 'Village People YMCA', title: 'Y.M.C.A.', artist: 'Village People', decade: '80s', lang: 'en' },
      { q: 'Nirvana Smells Like Teen Spirit', title: 'Smells Like Teen Spirit', artist: 'Nirvana', decade: '90s', lang: 'en' },
      { q: 'Oasis Wonderwall', title: 'Wonderwall', artist: 'Oasis', decade: '90s', lang: 'en' },
      { q: 'Red Hot Chili Peppers Californication', title: 'Californication', artist: 'Red Hot Chili Peppers', decade: '90s', lang: 'en' },
      { q: 'ACDC Highway To Hell', title: 'Highway To Hell', artist: 'AC/DC', decade: '80s', lang: 'en' },
      { q: 'Cher Believe', title: 'Believe', artist: 'Cher', decade: '90s', lang: 'en' },
      { q: 'Lou Bega Mambo No 5', title: 'Mambo No. 5', artist: 'Lou Bega', decade: '90s', lang: 'en' },
    ],
  },

  reggaeton_2000: {
    name: 'Reggaetón 2000s Clásico',
    songs: [
      { q: 'Daddy Yankee Gasolina', title: 'Gasolina', artist: 'Daddy Yankee', decade: '2000s', lang: 'es' },
      { q: 'Daddy Yankee Lo Que Paso Paso', title: 'Lo Que Pasó, Pasó', artist: 'Daddy Yankee', decade: '2000s', lang: 'es' },
      { q: 'Daddy Yankee Rompe', title: 'Rompe', artist: 'Daddy Yankee', decade: '2000s', lang: 'es' },
      { q: 'Daddy Yankee Llamado De Emergencia', title: 'Llamado De Emergencia', artist: 'Daddy Yankee', decade: '2000s', lang: 'es' },
      { q: 'Daddy Yankee Ella Me Levanto', title: 'Ella Me Levantó', artist: 'Daddy Yankee', decade: '2000s', lang: 'es' },
      { q: 'Daddy Yankee Tu Principe', title: 'Tu Príncipe', artist: 'Daddy Yankee & Zion & Lennox', decade: '2000s', lang: 'es' },
      { q: 'Don Omar Dile', title: 'Dile', artist: 'Don Omar', decade: '2000s', lang: 'es' },
      { q: 'Don Omar Pobre Diabla', title: 'Pobre Diabla', artist: 'Don Omar', decade: '2000s', lang: 'es' },
      { q: 'Don Omar Dale Don Dale', title: 'Dale Don Dale', artist: 'Don Omar', decade: '2000s', lang: 'es' },
      { q: 'Don Omar Salio El Sol', title: 'Salió El Sol', artist: 'Don Omar', decade: '2000s', lang: 'es' },
      { q: 'Don Omar Danza Kuduro', title: 'Danza Kuduro', artist: 'Don Omar & Lucenzo', decade: '2010s', lang: 'es' },
      { q: 'Don Omar Bandoleros', title: 'Bandoleros', artist: 'Don Omar & Tego Calderón', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Rakata', title: 'Rakata', artist: 'Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Noche De Entierro', title: 'Noche De Entierro', artist: 'Daddy Yankee & Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Mayor Que Yo', title: 'Mayor Que Yo', artist: 'Baby Ranks, Daddy Yankee, Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Sexy Movimiento', title: 'Sexy Movimiento', artist: 'Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Pegao', title: 'Pegao', artist: 'Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Wisin y Yandel Abusadora', title: 'Abusadora', artist: 'Wisin & Yandel', decade: '2000s', lang: 'es' },
      { q: 'Calle 13 Atrevete te te', title: 'Atrévete-Te-Te', artist: 'Calle 13', decade: '2000s', lang: 'es' },
      { q: 'Hector y Tito Baila Morena', title: 'Baila Morena', artist: 'Héctor & Tito', decade: '2000s', lang: 'es' },
      { q: 'Hector y Tito Felina', title: 'Felina', artist: 'Héctor & Tito', decade: '2000s', lang: 'es' },
      { q: 'Zion y Lennox Hay Algo En Ti', title: 'Hay Algo En Ti', artist: 'Zion & Lennox', decade: '2000s', lang: 'es' },
      { q: 'Zion y Lennox Zun Da Da', title: 'Zun Da Da', artist: 'Zion', decade: '2000s', lang: 'es' },
      { q: 'Angel y Khriz Ven Bailalo', title: 'Ven Báilalo', artist: 'Angel & Khriz', decade: '2000s', lang: 'es' },
      { q: 'Angel y Khriz Na De Na', title: 'Na De Na', artist: 'Angel & Khriz', decade: '2000s', lang: 'es' },
      { q: 'Alexis y Fido Cinco Letras', title: '5 Letras', artist: 'Alexis & Fido', decade: '2000s', lang: 'es' },
      { q: 'Alexis y Fido El Tiburon', title: 'El Tiburón', artist: 'Alexis & Fido', decade: '2000s', lang: 'es' },
      { q: 'Alexis y Fido Bartender', title: 'Bartender', artist: 'Alexis & Fido', decade: '2000s', lang: 'es' },
      { q: 'Tego Calderon Pa Que Retozen', title: 'Pa\' Que Retozen', artist: 'Tego Calderón', decade: '2000s', lang: 'es' },
      { q: 'Tego Calderon Guasa Guasa', title: 'Guasa Guasa', artist: 'Tego Calderón', decade: '2000s', lang: 'es' },
      { q: 'Plan B Si No Le Contesto', title: 'Si No Le Contesto', artist: 'Plan B', decade: '2010s', lang: 'es' },
      { q: 'Plan B Es Un Secreto', title: 'Es Un Secreto', artist: 'Plan B', decade: '2010s', lang: 'es' },
      { q: 'RKM y Ken-Y Down', title: 'Down', artist: 'R.K.M & Ken-Y', decade: '2000s', lang: 'es' },
      { q: 'RKM y Ken-Y Me Matas', title: 'Me Matas', artist: 'R.K.M & Ken-Y', decade: '2000s', lang: 'es' },
      { q: 'Trebol Clan Gata Fiera', title: 'Gata Fiera', artist: 'Trébol Clan', decade: '2000s', lang: 'es' },
      { q: 'Trebol Clan Bailame', title: 'Báilame', artist: 'Trébol Clan', decade: '2000s', lang: 'es' },
      { q: 'Ivy Queen Quiero Bailar', title: 'Quiero Bailar', artist: 'Ivy Queen', decade: '2000s', lang: 'es' },
      { q: 'Tony Dize El Doctorado', title: 'El Doctorado', artist: 'Tony Dize', decade: '2000s', lang: 'es' },
      { q: 'Tony Dize Quizas', title: 'Quizás', artist: 'Tony Dize', decade: '2000s', lang: 'es' },
      { q: 'Tito El Bambino El Amor', title: 'El Amor', artist: 'Tito El Bambino', decade: '2000s', lang: 'es' },
      { q: 'Jowell y Randy No Te Veo', title: 'No Te Veo', artist: 'Casa de Leones', decade: '2000s', lang: 'es' },
    ],
  },
};

/**
 * Filter and select random candidates based on user preferences.
 * Supports exclusion of existing playlist titles to prevent repetition.
 */
export function selectDjSongCandidates({
  genre = 'all',
  decade = 'all',
  language = 'all',
  count = 15,
  excludeTitles = [],
}) {
  let pool = [];

  if (genre === 'all') {
    Object.values(DJ_CATALOG).forEach((cat) => {
      pool.push(...cat.songs);
    });
  } else if (DJ_CATALOG[genre]) {
    pool.push(...DJ_CATALOG[genre].songs);
  } else {
    Object.values(DJ_CATALOG).forEach((cat) => {
      pool.push(...cat.songs);
    });
  }

  // Filter by decade if specific
  if (decade && decade !== 'all') {
    const filtered = pool.filter((s) => s.decade === decade);
    if (filtered.length >= 4) {
      pool = filtered;
    }
  }

  // Filter by language if specific
  if (language && language !== 'all') {
    const filtered = pool.filter((s) => s.lang === language);
    if (filtered.length >= 4) {
      pool = filtered;
    }
  }

  // Exclude songs already present in the current playlist (smart non-repetition)
  if (Array.isArray(excludeTitles) && excludeTitles.length > 0) {
    const normalizedExcluded = excludeTitles
      .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length > 2);

    if (normalizedExcluded.length > 0) {
      const nonExcluded = pool.filter((s) => {
        const normTitle = String(s.title).toLowerCase().replace(/[^a-z0-9]/g, '');
        const normArtist = String(s.artist).toLowerCase().replace(/[^a-z0-9]/g, '');
        const normQ = String(s.q).toLowerCase().replace(/[^a-z0-9]/g, '');

        return !normalizedExcluded.some(
          (ex) =>
            normTitle.includes(ex) ||
            ex.includes(normTitle) ||
            normQ.includes(ex) ||
            (normArtist.length > 3 && ex.includes(normArtist))
        );
      });

      // If we have enough fresh songs, use only fresh songs!
      if (nonExcluded.length >= count) {
        pool = nonExcluded;
      } else if (nonExcluded.length > 0) {
        // Prioritize fresh songs first, then shuffle
        pool = nonExcluded;
      }
    }
  }

  // Fisher-Yates Shuffle with true random distribution
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
