-- =====================================================
-- BASE DE DATOS: Agencia de Viajes Ica  (PostgreSQL)
-- Proyecto UTP 2026 - Grupo 3
-- Crear primero la base:   CREATE DATABASE agenciaviajes_db;
-- Luego ejecutar este script dentro de esa base.
-- =====================================================

DROP TABLE IF EXISTS comprobante        CASCADE;
DROP TABLE IF EXISTS detalle_venta      CASCADE;
DROP TABLE IF EXISTS venta              CASCADE;
DROP TABLE IF EXISTS reserva            CASCADE;
DROP TABLE IF EXISTS asignacion         CASCADE;
DROP TABLE IF EXISTS salidas            CASCADE;
DROP TABLE IF EXISTS horario_servicio   CASCADE;
DROP TABLE IF EXISTS usuario_cliente    CASCADE;
DROP TABLE IF EXISTS usuario_trabajador CASCADE;
DROP TABLE IF EXISTS transporte         CASCADE;
DROP TABLE IF EXISTS trabajador         CASCADE;
DROP TABLE IF EXISTS servicio           CASCADE;
DROP TABLE IF EXISTS cliente            CASCADE;

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nombres    VARCHAR(100) NOT NULL,
    dni        VARCHAR(15) UNIQUE NOT NULL,
    telefono   VARCHAR(15),
    correo     VARCHAR(100)
);

CREATE TABLE servicio (
    id_servicio SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    precio      DECIMAL(10,2) NOT NULL,
    capacidad   INT,
    estado      VARCHAR(20)
);

CREATE TABLE transporte (
    id_transporte SERIAL PRIMARY KEY,
    placa         VARCHAR(20) UNIQUE NOT NULL,
    tipo_vehiculo VARCHAR(50),
    capacidad     INT,
    marca         VARCHAR(50),
    estado        VARCHAR(20)
);

-- RFC-001: horarios disponibles por servicio (mañana/tarde/etc.)
CREATE TABLE horario_servicio (
    id_horario  SERIAL PRIMARY KEY,
    id_servicio INTEGER NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    estado      VARCHAR(20) DEFAULT 'Activo',
    CONSTRAINT fk_horario_servicio FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

CREATE TABLE salidas (
    id_salida            SERIAL PRIMARY KEY,
    fecha                DATE NOT NULL,
    disponibilidad_stock INT,
    id_transporte        INT,
    id_horario           INT,
    id_servicio          INT,
    CONSTRAINT fk_salidas_transporte FOREIGN KEY (id_transporte) REFERENCES transporte(id_transporte),
    CONSTRAINT fk_salida_horario     FOREIGN KEY (id_horario)    REFERENCES horario_servicio(id_horario),
    CONSTRAINT fk_salida_servicio    FOREIGN KEY (id_servicio)   REFERENCES servicio(id_servicio)
);

CREATE TABLE trabajador (
    id_trabajador SERIAL PRIMARY KEY,
    dni           VARCHAR(15) UNIQUE NOT NULL,
    nombres       VARCHAR(100) NOT NULL,
    puesto        VARCHAR(50),
    telefono      VARCHAR(15),
    correo        VARCHAR(100)
);

CREATE TABLE asignacion (
    id_asignacion SERIAL PRIMARY KEY,
    id_salida     INT,
    id_trabajador INT,
    funcion       VARCHAR(50),
    CONSTRAINT fk_asignacion_salida     FOREIGN KEY (id_salida)     REFERENCES salidas(id_salida),
    CONSTRAINT fk_asignacion_trabajador FOREIGN KEY (id_trabajador) REFERENCES trabajador(id_trabajador)
);

CREATE TABLE reserva (
    id_reserva        SERIAL PRIMARY KEY,
    fecha_reserva     DATE NOT NULL,
    fecha_servicio    DATE NOT NULL,
    cantidad_personas INT NOT NULL,
    estado            VARCHAR(50),
    origen_reserva    VARCHAR(30),
    id_cliente        INT,
    id_servicio       INT,
    id_salida         INT,
    CONSTRAINT fk_reserva_cliente  FOREIGN KEY (id_cliente)  REFERENCES cliente(id_cliente),
    CONSTRAINT fk_reserva_servicio FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio),
    CONSTRAINT fk_reserva_salida   FOREIGN KEY (id_salida)   REFERENCES salidas(id_salida)
);

CREATE TABLE venta (
    id_venta    SERIAL PRIMARY KEY,
    fecha       DATE NOT NULL,
    total       DECIMAL(10,2),
    metodo_pago VARCHAR(50),
    estado      VARCHAR(50),
    id_cliente  INT,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

CREATE TABLE detalle_venta (
    id_detalle      SERIAL PRIMARY KEY,
    id_venta        INT,
    id_servicio     INT,
    cantidad        INT,
    precio_unitario DECIMAL(10,2),
    subtotal        DECIMAL(10,2),
    CONSTRAINT fk_detalle_venta    FOREIGN KEY (id_venta)    REFERENCES venta(id_venta),
    CONSTRAINT fk_detalle_servicio FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

CREATE TABLE comprobante (
    id_comprobante SERIAL PRIMARY KEY,
    tipo           VARCHAR(20),
    numero         VARCHAR(50),
    fecha_emision  DATE,
    monto_total    DECIMAL(10,2),
    id_venta       INT UNIQUE,
    CONSTRAINT fk_comprobante_venta FOREIGN KEY (id_venta) REFERENCES venta(id_venta)
);

CREATE TABLE usuario_trabajador (
    id_usuario    SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    estado        VARCHAR(20),
    ultimo_acceso TIMESTAMP,
    id_trabajador INT UNIQUE,
    CONSTRAINT fk_usuario_trabajador FOREIGN KEY (id_trabajador) REFERENCES trabajador(id_trabajador)
);

CREATE TABLE usuario_cliente (
    id_usuario_cliente SERIAL PRIMARY KEY,
    username           VARCHAR(50) UNIQUE NOT NULL,
    password           VARCHAR(255) NOT NULL,
    fecha_registro     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_cliente         INT UNIQUE,
    CONSTRAINT fk_usuario_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- =====================================================
-- DATOS INICIALES
-- =====================================================
INSERT INTO servicio (nombre, descripcion, precio, capacidad, estado) VALUES
('Huacachina & Buggies',    'Paseo en tubulares por las dunas y práctica de sandboarding en el Oasis de América.', 180, 20, 'activo'),
('Reserva de Paracas',      'Tour por las playas de la Reserva Nacional: Playa Roja, Lagunillas y formaciones rocosas.', 220, 15, 'activo'),
('Islas Ballestas',         'Tour en lancha para observar lobos marinos, pingüinos de Humboldt y aves guaneras.', 150, 25, 'activo'),
('Sobrevuelo Líneas Nazca', 'Vuelo panorámico sobre los milenarios geoglifos de Nazca desde el aeródromo.', 450, 6,  'activo'),
('Viñedos y Bodegas',       'Recorrido por las principales bodegas vitivinícolas de Ica con cata de vinos y piscos.', 120, 20, 'activo'),
('Cañón de los Perdidos',   'Expedición al impresionante cañón ubicado en el desierto de Ocucaje. Paisajes increíbles.', 280, 12, 'activo');

-- RFC-001: horarios reales por servicio
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
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '09:30', '14:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '11:30', '16:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '14:30', '18:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';
INSERT INTO horario_servicio (id_servicio, hora_inicio, hora_fin, estado)
SELECT id_servicio, '16:30', '21:30', 'Activo' FROM servicio WHERE nombre = 'Huacachina & Buggies';

INSERT INTO transporte (placa, tipo_vehiculo, capacidad, marca, estado) VALUES
('V1A-123', 'Minivan',   15, 'Toyota Hiace',  'disponible'),
('V2B-456', 'Bus',       40, 'Mercedes-Benz', 'disponible'),
('V3C-789', 'Buggy',      8, 'Arena Craft',   'disponible'),
('V4D-012', 'Lancha',    25, 'Yamaha Marine', 'disponible'),
('V5E-345', 'Camioneta',  6, 'Toyota Hilux',  'mantenimiento');

INSERT INTO trabajador (dni, nombres, puesto, telefono, correo) VALUES
('10000001', 'Administrador General', 'administrador', '987000001', 'admin@agenciaica.com'),
('45123456', 'Carlos Mendoza Quispe', 'guia',          '956123001', 'carlos@agenciaica.com'),
('45234567', 'José Ramos Flores',     'chofer',        '956123002', 'jose@agenciaica.com'),
('45345678', 'Ana Torres Palomino',   'vendedor',      '956123003', 'ana@agenciaica.com'),
('45456789', 'Luis Ccori Valencia',   'operador',      '956123004', 'luis@agenciaica.com');

-- Usuario intranet por defecto → username: admin  ·  password: Admin1234
INSERT INTO usuario_trabajador (username, password, estado, id_trabajador) VALUES
('admin', '$2b$10$7KLDcxMNMfKJe6A2zHopgedzROLnNlMtEVh30wtefHpT/KR93m1o2', 'activo', 1);
