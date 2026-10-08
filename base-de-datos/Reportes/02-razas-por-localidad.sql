-- Reporte 2: Razas y su presencia por localidad
-- Cruza raza, raza_localidad y localidad, con el detalle de subrazas.
SELECT r.nombre AS raza,
       COUNT(DISTINCT rl.localidad_id) AS localidades,
       ROUND(AVG(rl.porcentaje_poblacion), 2) AS porcentaje_promedio,
       GROUP_CONCAT(DISTINCT l.nombre ORDER BY l.nombre SEPARATOR ', ') AS donde,
       GROUP_CONCAT(DISTINCT sr.nombre ORDER BY sr.nombre SEPARATOR ', ') AS subrazas
  FROM raza_localidad rl
  JOIN raza r ON r.id = rl.raza_id
  JOIN localidad l ON l.id = rl.localidad_id
  LEFT JOIN subraza sr ON sr.raza_id = r.id
 GROUP BY r.id
 ORDER BY localidades DESC, r.nombre;