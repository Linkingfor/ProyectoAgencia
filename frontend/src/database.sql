-- =====================================================
-- BASE DE DATOS: Agencia de Viajes Ica
-- Proyecto UTP 2026 - Grupo 3
-- =====================================================

CREATE DATABASE IF NOT EXISTS agencia_viajes_ica
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE agencia_viajes_ica;

-- ─── USUARIOS DEL SISTEMA (login) ────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  correo       VARCHAR(100) UNIQUE NOT NULL,
  contrasena   VARCHAR(255) NOT NULL,
  rol          ENUM('administrador','vendedor','operador') NOT NULL DEFAULT 'vendedor',
  activo       TINYINT(1) DEFAULT 1,
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── CLIENTES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cliente (
  id_cliente   INT AUTO_INCREMENT PRIMARY KEY,
  nombres      VARCHAR(150) NOT NULL,
  dni          VARCHAR(20) UNIQUE NOT NULL,
  telefono     VARCHAR(20),
  correo       VARCHAR(100),
  procedencia  VARCHAR(100),
  creado_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── SERVICIOS / PAQUETES TURÍSTICOS ─────────────────
CREATE TABLE IF NOT EXISTS servicio (
  id_servicio  INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(150) NOT NULL,
  descripcion  TEXT,
  precio       DECIMAL(10,2) NOT NULL,
  capacidad    INT NOT NULL,
  estado       ENUM('activo','inactivo') DEFAULT 'activo'
);

-- ─── RESERVAS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva        INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente        INT NOT NULL,
  id_servicio       INT NOT NULL,
  fecha_reserva     DATE NOT NULL,
  fecha_servicio    DATE NOT NULL,
  cantidad_personas INT NOT NULL DEFAULT 1,
  estado            ENUM('pendiente','confirmada','cancelada') DEFAULT 'pendiente',
  FOREIGN KEY (id_cliente)  REFERENCES cliente(id_cliente),
  FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

-- ─── VENTAS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venta (
  id_venta     INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente   INT NOT NULL,
  fecha        DATE NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  metodo_pago  VARCHAR(50) NOT NULL,
  estado       ENUM('pagado','pendiente','anulado') DEFAULT 'pagado',
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
);

-- ─── DETALLE DE VENTA ─────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_venta (
  id_detalle      INT AUTO_INCREMENT PRIMARY KEY,
  id_venta        INT NOT NULL,
  id_servicio     INT NOT NULL,
  cantidad        INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (id_venta)    REFERENCES venta(id_venta),
  FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

-- ─── COMPROBANTES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS comprobante (
  id_comprobante INT AUTO_INCREMENT PRIMARY KEY,
  tipo           ENUM('boleta','factura','nota_credito','nota_debito') NOT NULL,
  numero         VARCHAR(20) UNIQUE NOT NULL,
  fecha_emision  DATE NOT NULL,
  monto_total    DECIMAL(10,2) NOT NULL,
  id_venta       INT NOT NULL,
  FOREIGN KEY (id_venta) REFERENCES venta(id_venta)
);

-- ─── TRABAJADORES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS trabajador (
  id_trabajador INT AUTO_INCREMENT PRIMARY KEY,
  dni           VARCHAR(20) UNIQUE NOT NULL,
  nombres       VARCHAR(150) NOT NULL,
  puesto        ENUM('guia','chofer','asistente') NOT NULL,
  telefono      VARCHAR(20),
  correo        VARCHAR(100)
);

-- ─── SALIDAS DIARIAS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS salidas (
  id_salida            INT AUTO_INCREMENT PRIMARY KEY,
  id_servicio          INT NOT NULL,
  fecha                DATE NOT NULL,
  hora_salida          TIME NOT NULL,
  hora_retorno         TIME,
  disponibilidad_stock INT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_servicio) REFERENCES servicio(id_servicio)
);

-- ─── ASIGNACIONES DE PERSONAL ─────────────────────────
CREATE TABLE IF NOT EXISTS asignacion (
  id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
  id_salida     INT NOT NULL,
  id_trabajador INT NOT NULL,
  funcion       VARCHAR(50),
  FOREIGN KEY (id_salida)     REFERENCES salidas(id_salida),
  FOREIGN KEY (id_trabajador) REFERENCES trabajador(id_trabajador)
);

-- ─── DATOS INICIALES ──────────────────────────────────

-- Usuario admin por defecto (correo: admin@agenciaica.com — password: Admin1234)
INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES
('Administrador', 'admin@agenciaica.com', '$2b$10$7KLDcxMNMfKJe6A2zHopgedzROLnNlMtEVh30wtefHpT/KR93m1o2', 'administrador');

-- Paquetes turísticos de Ica
INSERT INTO servicio (nombre, descripcion, precio, capacidad, estado) VALUES
('Huacachina & Buggies',    'Paseo en tubulares por las dunas y práctica de sandboarding en el Oasis de América.', 180, 20, 'activo'),
('Reserva de Paracas',      'Tour por las playas de la Reserva Nacional: Playa Roja, Lagunillas y formaciones rocosas.', 220, 15, 'activo'),
('Islas Ballestas',         'Tour en lancha para observar lobos marinos, pingüinos de Humboldt y aves guaneras.', 150, 25, 'activo'),
('Sobrevuelo Líneas Nazca', 'Vuelo panorámico sobre las milenarias geoglifos de Nazca desde el aeródromo.', 450, 6,  'activo'),
('Viñedos y Bodegas',       'Recorrido por las principales bodegas vitivinícolas de Ica con cata de vinos y piscos.', 120, 20, 'activo'),
('Cañón de los Perdidos',   'Expedición al impresionante cañón ubicado en el desierto de Ocucaje. Paisajes increíbles.', 280, 12, 'activo');

-- Trabajadores de ejemplo
INSERT INTO trabajador (dni, nombres, puesto, telefono) VALUES
('45123456', 'Carlos Mendoza Quispe',  'guia',   '956123001'),
('45234567', 'José Ramos Flores',      'chofer', '956123002'),
('45345678', 'Ana Torres Palomino',    'guia',   '956123003'),
('45456789', 'Luis Ccori Valencia',    'chofer', '956123004');

SELECT 'Base de datos creada correctamente ✅' AS resultado;
