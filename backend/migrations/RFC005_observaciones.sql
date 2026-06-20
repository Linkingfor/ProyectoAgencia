-- =====================================================
-- RFC-005: Adición de columna Observaciones a la tabla Reservas
-- Campo de texto libre para que el personal operativo registre
-- notas internas de cada reserva (alergias, punto de recojo,
-- requerimientos especiales, contacto adicional, etc.).
-- =====================================================

ALTER TABLE reserva
ADD COLUMN IF NOT EXISTS observaciones TEXT;
