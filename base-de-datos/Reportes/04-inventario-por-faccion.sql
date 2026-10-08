-- Reporte 4: Inventario por faccion y personaje
-- Cruza faccion, personaje_faccion, personaje y personaje_item con item.
SELECT f.nombre AS faccion,
       COUNT(DISTINCT pf.personaje_id) AS miembros,
       p.nombre AS personaje,
       COUNT(DISTINCT pi.item_id) AS objetos,
       GROUP_CONCAT(DISTINCT i.nombre ORDER BY i.nombre SEPARATOR ', ') inventario
  FROM faccion f
  JOIN personaje_faccion pf ON pf.faccion_id = f.id
  JOIN personaje p ON p.id = pf.personaje_id
  LEFT JOIN personaje_item pi ON pi.personaje_id = p.id
  LEFT JOIN item i ON i.id = pi.item_id
 GROUP BY f.id, p.id
 ORDER BY f.nombre, objetos DESC, p.nombre;