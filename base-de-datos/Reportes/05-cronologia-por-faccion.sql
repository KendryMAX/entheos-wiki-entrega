-- Reporte 5: Cronologia por era y faccion
-- Cruza era, evento, evento_participante, personaje y personaje_faccion.
SELECT e.nombre AS era,
       ev.nombre AS evento,
       ev.fecha,
       f.nombre AS faccion,
       p.nombre AS personaje,
       ep.papel
  FROM evento ev
  JOIN era e ON e.id = ev.era_id
  LEFT JOIN evento_participante ep ON ep.evento_id = ev.id
  LEFT JOIN personaje p ON p.id = ep.personaje_id
  LEFT JOIN personaje_faccion pf ON pf.personaje_id = p.id
  LEFT JOIN faccion f ON f.id = pf.faccion_id
 ORDER BY ev.fecha IS NULL, ev.fecha, f.nombre, p.nombre;