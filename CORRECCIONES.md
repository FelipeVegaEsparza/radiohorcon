# Resumen de Correcciones - Radio Horcón

## Problemas Identificados

### 1. Errores 500 en archivos JS
**Causa:** El servidor no estaba sirviendo correctamente los archivos estáticos y el error handler no proporcionaba información detallada.

**Solución:**
- Mejorado el manejo de errores en las rutas `/assets/*` y `/templates/:template/*`
- Agregado logging detallado para identificar qué archivos fallan
- El error handler ahora devuelve JSON con información del error incluyendo la URL

### 2. Rate Limiting muy restrictivo (Errores 429)
**Causa:** El límite estaba en 100 requests por 15 minutos en producción, incluyendo archivos estáticos.

**Solución:**
- Aumentado el límite a 1000 requests por 15 minutos en producción
- Excluidos los archivos estáticos (JS, CSS, imágenes, fuentes) del rate limiting
- Los archivos estáticos ahora pueden cargarse sin restricciones

### 3. Content Security Policy (CSP) bloqueando fuentes
**Causa:** El `connectSrc` no incluía `https://fonts.gstatic.com`, causando que el service worker no pudiera cargar las fuentes de Google.

**Solución:**
- Agregado `https://fonts.gstatic.com` a la directiva `connectSrc`
- Modificado el service worker para no intentar cachear recursos de fonts.gstatic.com

### 4. Content-Type incorrecto para archivos JS
**Causa:** Algunos servidores no envían el header `Content-Type: application/javascript` correctamente.

**Solución:**
- Agregado middleware que establece el Content-Type correcto para archivos `.js`
- Agregado header `X-Content-Type-Options: nosniff` para evitar MIME type sniffing

## Archivos Modificados

1. **server.js**
   - Rate limiting mejorado (líneas 13-25)
   - CSP actualizado con fonts.gstatic.com (líneas 79-91)
   - Middleware para headers de archivos estáticos (líneas 133-145)
   - Mejor manejo de errores en rutas de assets (líneas 398-422)
   - Error handler mejorado con logging detallado (líneas 470-485)

2. **service-worker.js**
   - Removidos dominios de fuentes de Google de CACHEABLE_DOMAINS (líneas 5-11)

## Próximos Pasos

1. **Desplegar los cambios** en el servidor de producción
2. **Limpiar el cache del navegador** y del service worker
3. **Verificar los logs** del servidor para confirmar que los errores 500 desaparecen
4. **Monitorear** las peticiones para asegurar que el rate limiting no afecte la experiencia del usuario

## Comandos Útiles

```bash
# Reiniciar el servidor
npm restart

# O si usas PM2
pm2 restart radiohorcon

# Ver logs en tiempo real
pm2 logs radiohorcon
```

## Notas Importantes

- El template configurado actualmente es **"playlist"** (según config.json)
- El límite de rate limiting ahora es más permisivo pero aún protege contra ataques DoS
- Los archivos estáticos están excluidos del rate limiting para mejorar la performance
- El CSP ahora permite todas las conexiones necesarias para la aplicación