-- =====================================================
-- RFC-001: Incorporación de la entidad HorarioServicio y
-- reestructuración de las relaciones entre Servicio, Salida
-- y Reserva, para permitir múltiples horarios por servicio
-- y una programación más flexible de las salidas turísticas.
-- =====================================================

-- 1. Nueva tabla: horarios disponibles por servicio
CREATE TABLE horario_servicio (
    id_horario  SERIAL PRIMARY KEY,
    id_servicio INTEGER NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    estado      VARCHAR(20) DEFAULT 'Activo',

    CONSTRAINT fk_horario_servicio
        FOREIGN KEY (id_servicio)
        REFERENCES servicio(id_servicio)
);

-- 2. Restructurar la tabla salidas
--    Antes: la salida solo tenía hora_salida/hora_retorno propias y
--    se vinculaba a un servicio indirectamente a través de reserva.
--    Ahora: la salida se vincula directo a un servicio y a uno de
--    sus horarios definidos en horario_servicio.

ALTER TABLE salidas DROP COLUMN hora_salida;
ALTER TABLE salidas DROP COLUMN hora_retorno;

ALTER TABLE salidas ADD COLUMN id_horario INTEGER;
ALTER TABLE salidas ADD COLUMN id_servicio INTEGER;

ALTER TABLE salidas ADD CONSTRAINT fk_salida_horario
    FOREIGN KEY (id_horario) REFERENCES horario_servicio(id_horario);
ALTER TABLE salidas ADD CONSTRAINT fk_salida_servicio
    FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio);

-- 3. Horarios reales de cada servicio
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '06:00', '16:00', 'Activo' FROM servicio WHERE nombre = 'Islas Ballestas';

INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '06:00', '16:00', 'Activo' FROM servicio WHERE nombre = 'Cañón de los Perdidos';

INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '06:00', '16:00', 'Activo' FROM servicio WHERE nombre = 'Reserva de Paracas';

INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '06:00', '15:00', 'Activo' FROM servicio WHERE nombre = 'Sobrevuelo Líneas Nazca';

INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '10:30', '13:30', 'Activo' FROM servicio WHERE nombre = 'Viñedos y Bodegas';

-- Huacachina & Buggies tiene 4 horarios distintos en el día
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '09:30', '14:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '11:30', '16:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '14:30', '18:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '16:30', '21:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
