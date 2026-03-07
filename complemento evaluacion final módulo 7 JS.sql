DROP TABLE IF EXISTS paises_pib;
DROP TABLE IF EXISTS paises;
DROP TABLE IF EXISTS paises_data_web;
CREATE TABLE paises
(
    nombre character varying(200) NOT NULL,
    continente character varying(200),
    poblacion integer,
    PRIMARY KEY (nombre)
);

INSERT INTO paises (nombre, continente, poblacion) values ('Luxemburgo', 'Europa', 602005);
INSERT INTO paises (nombre, continente, poblacion) values ('Suiza', 'Europa', 8500000);
INSERT INTO paises (nombre, continente, poblacion) values ('Noruega', 'Europa', 5367580);
INSERT INTO paises (nombre, continente, poblacion) values ('Estados Unidos', 'America', 325719178);
INSERT INTO paises (nombre, continente, poblacion) values ('Holanda', 'Europa', 6100000);
INSERT INTO paises (nombre, continente, poblacion) values ('Finlandia', 'Europa', 5513000);
INSERT INTO paises (nombre, continente, poblacion) values ('Alemania', 'Europa', 83149300);
INSERT INTO paises (nombre, continente, poblacion) values ('Japon', 'Asia', 126150000);
INSERT INTO paises (nombre, continente, poblacion) values ('España', 'Europa', 47329981);
INSERT INTO paises (nombre, continente, poblacion) values ('Chile', 'America', 19107216);
INSERT INTO paises (nombre, continente, poblacion) values ('Mexico', 'America', 128649565);
INSERT INTO paises (nombre, continente, poblacion) values ('Brasil', 'America', 212216052);
INSERT INTO paises (nombre, continente, poblacion) values ('Argentina', 'America', 45195777);

CREATE TABLE paises_pib
(
    nombre character varying(200) NOT NULL,
    pib_2019 integer,
    pib_2020 integer,
    PRIMARY KEY (nombre),
    CONSTRAINT fk_paises FOREIGN KEY (nombre)
        REFERENCES paises (nombre) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
);

INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Luxemburgo', 115200, 116730);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Suiza', 85160, 86670);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Noruega', 82770, 78330);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Estados Unidos', 65060, 67430);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Holanda', 54130, 53870);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Finlandia', 50880, 50770);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Alemania', 49690, 47990);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Japon', 41420, 43040);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('España', 31910, 30730);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Chile', 16280, 15850);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Mexico', 9870, 10410);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Brasil', 9160, 8960);
INSERT INTO paises_pib (nombre, pib_2019, pib_2020) values ('Argentina', 9050, 9730);

CREATE TABLE paises_data_web
(
    nombre_pais character varying NOT NULL,
    accion integer,
    PRIMARY KEY (nombre_pais)
);

INSERT INTO paises_data_web (nombre_pais, accion) values ('Luxemburgo', 1);
INSERT INTO paises_data_web (nombre_pais, accion) values ('Suiza', 1);
INSERT INTO paises_data_web (nombre_pais, accion) values ('Noruega', 1);
INSERT INTO paises_data_web (nombre_pais, accion) values ('Estados Unidos', 1);
INSERT INTO paises_data_web (nombre_pais, accion) values ('Holanda', 1);
INSERT INTO paises_data_web (nombre_pais, accion) values ('Finlandia', 1);
