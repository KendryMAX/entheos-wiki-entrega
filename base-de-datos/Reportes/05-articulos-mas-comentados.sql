-- Reporte 6: Articulos mas comentados
-- Cruza articulo, comentario y usuario, con el promedio de visitas.
SELECT a.titulo,
       u.nombre_usuario AS autor,
       c.nombre AS categoria,
       COUNT(co.id) AS comentarios,
       a.vistas,
       ROUND(COUNT(co.id) / (a.vistas / 1000), 2) AS comentarios_por_mil_visitas
  FROM articulo a
  JOIN usuario u ON u.id = a.autor_id
  LEFT JOIN categoria c ON c.id = a.categoria_id
  LEFT JOIN comentario co ON co.articulo_id = a.id
 GROUP BY a.id
 ORDER BY comentarios DESC, a.vistas DESC;