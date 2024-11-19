Objetivo
--
Extraer de usuarios registrados en *leeti* información de rango y partidas usando su **API**. El usuario debe tener publico su historial en *leeti*, y tener cuenta en la misma página. 
## Funciones
Ver datos de las últimas partidas mostrando datos como:
- *mapa*: el que se jugó.
- *marcador*: ordenado en función de quién ganó.
- *fecha*: Cuando terminó la partida.
- *variación de elo*: el de antes, el actual y su variación.

Mostrar el rango, ultima consulta hecha y racha de las últimas 5 partidas. 

Se ha usado [cli-table3](https://www.npmjs.com/package/cli-table3) para las tablas y [express](https://www.npmjs.com/package/express) para el servidor. 

# Instalación y ejecución
Ejecutar `npm install` y para funcionar `npm start`