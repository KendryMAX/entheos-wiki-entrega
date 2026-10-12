-- Reporte 5: Articulos mas comentados
-- Cruza articulo, comentario, usuario y categoria, con el promedio de visitas.
-- Se excluyen las plantillas y los articulos que no estan publicados; si el
-- articulo no tiene vistas, la relacion por mil visitas queda vacia.
SELECT a.titulo,
       u.nombre_usuario AS autor,
       COALESCE(c.nombre, 'Sin categoria') AS categoria,
       COUNT(co.id) AS comentarios,
       a.vistas,
       ROUND(COUNT(co.id) / (NULLIF(a.vistas, 0) / 1000), 2) AS comentarios_por_mil_visitas
  FROM articulo a
  JOIN usuario u ON u.id = a.autor_id
  LEFT JOIN categoria c ON c.id = a.categoria_id
  LEFT JOIN comentario co ON co.articulo_id = a.id
 WHERE a.estado = 'publicado' AND a.titulo NOT LIKE 'Plantilla%'
 GROUP BY a.id
 ORDER BY comentarios DESC, a.vistas DESC;