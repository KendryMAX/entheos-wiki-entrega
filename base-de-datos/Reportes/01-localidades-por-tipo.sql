-- Reporte 1: Localidades por tipo de asentamiento
-- Cruza localidad, tipo_asentamiento y zona_geografica.
-- El modelo no guarda una cifra de poblacion en localidad, asi que el reporte
-- usa la cantidad de localidades, su fundacion mas antigua y las zonas donde
-- se concentran.
SELECT ta.nombre AS tipo,
       COUNT(*) AS localidades,
       GROUP_CONCAT(DISTINCT z.nombre ORDER BY z.nombre SEPARATOR ', ') AS zonas,
       MIN(l.fundacion) AS fundacion_mas_antigua,
       MAX(l.fundacion) AS fundacion_mas_reciente
  FROM localidad l
  JOIN tipo_asentamiento ta ON ta.id = l.tipo_asentamiento_id
  LEFT JOIN zona_geografica z ON z.id = l.zona_geografica_id
 GROUP BY ta.id
 ORDER BY localidades DESC, ta.nombre;