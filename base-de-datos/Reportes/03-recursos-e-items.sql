-- Reporte 3: Recursos y los items que los requieren
-- Cruza recurso, item_recurso e item. No hay tabla de region en el modelo,
-- asi que se agrupa por la unidad de medida del recurso.
SELECT r.nombre AS recurso,
       r.unidad_medida,
       COUNT(DISTINCT ir.item_id) AS items,
       GROUP_CONCAT(DISTINCT i.nombre ORDER BY i.nombre SEPARATOR ', ') AS items_que_lo_usan,
       SUM(ir.cantidad_requerida) AS cantidad_total
  FROM recurso r
  LEFT JOIN item_recurso ir ON ir.recurso_id = r.id
  LEFT JOIN item i ON i.id = ir.item_id
 GROUP BY r.id
 ORDER BY items DESC, r.nombre;