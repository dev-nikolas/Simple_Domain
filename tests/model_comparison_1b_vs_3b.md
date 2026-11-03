# Comparación de Rendimiento y Calidad de Código: Dolphin 3B vs Llama 3.2 1B

Documento generado automáticamente para evaluar la viabilidad de un modelo liviano (1B-1.5B) como opción rápida frente al modelo estándar (3B), y el impacto de concisión en el system prompt.

## 1. Resumen de Velocidad de Decodificación (Decode tok/s)

| Métrica / Modelo | Dolphin 3B Q4_K_M (1.9 GB) | Llama 3.2 1B Q4_K_M (771 MB) | Factor de Aceleración |
|---|---|---|---|
| **Decode Mediana (3 rep)** | **5.88 tok/s** | **14.32 tok/s** | **2.44× más rápido** |
| Repetición 1 | 5.44 tok/s (350 tokens) | 11.65 tok/s (350 tokens) | 2.14× |
| Repetición 2 | 6.02 tok/s (350 tokens) | 14.32 tok/s (350 tokens) | 2.38× |
| Repetición 3 | 5.88 tok/s (350 tokens) | 14.59 tok/s (346 tokens) | 2.48× |

## 2. Impacto de Instrucción de Concisión en System Prompt (Modelo 3B)

| ID | Tarea / Prompt | Tokens Estándar | Tokens Conciso | Reducción de Tokens | Ahorro (%) |
|---|---|---|---|---|---|
| 1 | Función: Cola de tareas asíncronas con reintentos y jitter (TypeScript) | 641 | 539 | -102 | -15.9% |
| 2 | Bug / Depuración: Concurrencia multihilo con SQLite (Python) | 597 | 650 | +53 | +8.9% |
| 3 | Explicación técnica: epoll EPOLLLT vs EPOLLET y socket starvation (Linux/C) | 650 | 650 | -0 | -0.0% |
| 4 | Script: Verificador de salud HTTP concurrente con asyncio y tabla ASCII (Python) | 501 | 513 | +12 | +2.4% |
| 5 | Tipado avanzado: DeepReadonly<T> recursivo (TypeScript) | 308 | 650 | +342 | +111% |
| 6 | Concurrencia / Memory Ordering: Spinlock Relaxed vs Acquire/Release (Rust) | 338 | 369 | +31 | +9.2% |
| 7 | Streams / Backpressure: Pipeline de descompresión y validación CSV (Node.js) | 650 | 650 | -0 | -0.0% |
| 8 | Patrón de arquitectura: Transactional Outbox para mensajería fiable (Python) | 650 | 650 | -0 | -0.0% |
| **TOTAL** | **8 Prompts Evaluados** | **4335 tokens** | **4671 tokens** | **--336 tokens** | **--7.8%** |

> **Nota sobre Prefix Cache:** Al estructurar la instrucción de concisión como sufijo adicional sobre la base del System Prompt, el prefijo de tokens inicial permanece idéntico, preservando el reuso del KV cache en memoria.

## 3. Comparativa Cualitativa y Técnica Lado a Lado (16 Respuestas)

### Prompt 1: Función: Cola de tareas asíncronas con reintentos y jitter (TypeScript)

**Instrucción / Prompt:**
```
Implementa en TypeScript una clase TaskQueue con concurrencia máxima configurable (concurrency: number), método addTask<T>(task: () => Promise<T>, retries?: number): Promise<T>, y reintentos automáticos con backoff exponencial y jitter ante errores.
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 641 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.69 tok/s
- **TTFT inicial:** 5414 ms

```text
Aquí tienes un ejemplo de cómo podrías implementar la clase TaskQueue en TypeScript:

```typescript
import { promisify } from 'bluebird';
import { setTimeout } from 'timers';

interface Task<T> {
  (): Promise<T>;
}

export default class TaskQueue<T> {
  concurrency: number;
  retries: number;
  backoffDelay: number;
  backoffJitter: number;

  constructor(concurrency: number, retries: number) {
    this.concurrency = concurrency;
    this.retries = retries;
    this.backoffDelay = 1000; // 1 segundo
    this.backoffJitter = 0.5; // 50% del segundo
  }

  async addTask(task: Task<T>, retries?: number): Promise<T> {
    let retriesCount = retries || 0;
    let retriesReached = false;

    while (!retriesReached && retriesCount < this.retries) {
      try {
        const result = await promisify(task)();
        return result;
      } catch (error) {
        retriesCount++;
        await this.backoffWithJitter(error);
        if (retriesCount < this.retries) {
          continue;
        } else {
          throw error;
        }
      }
    }
  }

  private backoffWithJitter(error: Error): Promise<void> {
    return new Promise<void>(resolve => {
      const backoffDelay = this.backoffDelay * Math.pow(2, Math.floor(error.stack.length / 10));
      const backoffJitter = this.backoffJitter * Math.random();
      setTimeout(backoffDelay + backoffJitter, () => {
        resolve();
      });
    });
  }
}
```

Este código define una clase TaskQueue que acepta una cantidad máxima de concurrencia y un número de reintentos como parámetros en su constructor. La clase también tiene un método addTask que permite agregar tareas al encolador. Este método maneja automáticamente los reintentos con backoff exponencial y jitter.

Para usar esta clase, simplemente importarla y crear un nuevo objeto TaskQueue con los valores deseados para la concurrencia máxima y el número de reintentos. Luego, puedes llamar al método addTask para agregar tareas al encolador y obtener los resultados de las tareas promediadas.

Por ejemplo:

```typescript
import TaskQueue from './TaskQueue';

const taskQueue = new TaskQueue(5, 3);

taskQueue.addTask((task: () => Promise<number>) => {
  return task().then((result: number) => {
    console.log('Task result:', result);
    return result * 2;
  });
});
```

En este ejemplo, se crea una nueva instancia de TaskQueue con una concurrencia máxima de 5 y un número de reintentos de 3. Luego, se llama al método addTask para agregar una tarea que devuelve un número promediado. El resultado de la tarea se promedia y luego se multiplica por 2 antes de devolverlo.
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 13.63 tok/s
- **TTFT inicial:** 2633 ms

```text
Aquí te muestro un ejemplo de implementación de la clase `TaskQueue` con concurrencia máxima configurable utilizando TypeScript y bibliotecas de concurrencia y reintentos automáticos.

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

interface Task {
  (): Promise<any>;
}

class TaskQueue {
  private concurrency: number;
  private maxConcurrency: number;
  private retryExponentialBackoff: (retries: number) => number;
  private jitter: number;

  constructor(concurrency: number, maxConcurrency: number, retryExponentialBackoff: (retries: number) => number, jitter: number = 1) {
    this.concurrency = concurrency;
    this.maxConcurrency = maxConcurrency;
    this.retryExponentialBackoff = retryExponentialBackoff;
    this.jitter = jitter;
  }

  async addTask<T>(task: Task, retries?: number): Promise<T> {
    if (retries === undefined) {
      retries = this.maxConcurrency;
    }

    const maxRetries = this.retryExponentialBackoff(retries);
    const backoff = (retries: number) => {
      return Math.pow(2, retries) * 0.1; // 10% backoff per retry
    };

    const taskPromise = task();

    const taskWorker = new Worker(__filename, {
      workerData: {
        task,
        retries,
        backoff,
        jitter,
      },
    });

    return new Promise((resolve) => {
      taskWorker.on('message', (result) => {
        resolve(result);
      });

      taskWorker.on('error', (error) => {
        console.error(`Error en la tarea: ${error.message}`);
        resolve(error);
      });

      taskWorker.on('exit', () => {
        console.log('Tarea terminada');
        resolve(null);
      });
    });
  }
}

// Ejemplo de uso
const taskQueue = new TaskQueue(5, 10, (retries) => retries * 2, 2);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea completada';
}, 5);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea fallida';
}, 5);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea fallida';
}, 5);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea fallida';
}, 5);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea fallida';
}, 5);

taskQueue.addTask(async () => {
  await new Promise((resolve) => globalThis.setTimeout(resolve, 1000));
  return 'Tarea
```

---

### Prompt 2: Bug / Depuración: Concurrencia multihilo con SQLite (Python)

**Instrucción / Prompt:**
```
Encuentra y explica el error de concurrencia en este fragmento Python y escribe la versión corregida y segura para hilos:
```python
import threading
import sqlite3

class EventLogger:
    def __init__(self, db_path='events.db'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)')
        self.conn.commit()

    def log(self, msg):
        self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))
        self.conn.commit()

logger = EventLogger()
threads = [threading.Thread(target=logger.log, args=(f'event_{i}',)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()
```
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 597 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.68 tok/s
- **TTFT inicial:** 11340 ms

```text
El error de concurrencia en este fragmento Python se debe a la falta de sincronización entre los hilos que intentan escribir en la misma base de datos (`self.conn`) y en la misma tabla (`logs`). Esto puede causar problemas de concurrencia, como la pérdida de datos o la corrupción de la base de datos.

Para corregir este error, se puede implementar una sincronización más detallada, como un mecanismo de bloqueo o un sistema de bloques. Sin embargo, en este caso, vamos a utilizar una técnica más simple y comúnmente utilizada en Python para evitar problemas de concurrencia: usar un bloqueo para la escritura en la base de datos.

Aquí está la versión corregida y segura para hilos:

```python
import threading
import sqlite3

class EventLogger:
    def __init__(self, db_path='events.db'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)')
        self.conn.commit()
        self.lock = threading.Lock()  # Bloqueo para la escritura

    def log(self, msg):
        self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))
        self.conn.commit()
        self.lock.acquire()  # Bloqueo para la escritura
        self.cursor.execute('SELECT COUNT(id) FROM logs WHERE msg = (?)', (msg,))
        count = self.cursor.fetchone()[0]
        self.lock.release()  # Fin del bloqueo para la escritura

        # Verificamos que no haya más de un registro por mensaje
        if count == 0:
            self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))
            self.conn.commit()

logger = EventLogger()
threads = [threading.Thread(target=logger.log, args=(f'event_{i}',)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()
```

En esta versión corregida, se ha añadido un bloqueo (`self.lock`) para la escritura en la base de datos. Esto asegura que solo un hilo pueda escribir en la base de datos en un momento dado, evitando problemas de concurrencia.

Además, se ha añadido una verificación para asegurarnos de que no haya más de un registro por mensaje. Esto se hace después de cada llamada a `self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))`, y se verifica que el número de registros en la tabla `logs` sea 0 antes de insertar un nuevo registro. Esto es útil para evitar la inserción de múltiples registros por el mismo mensaje.
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 543 (verificados por `/tokenize`)
- **Velocidad de generación:** 10.46 tok/s
- **TTFT inicial:** 4013 ms

```text
El error de concurrencia en este fragmento de código es que se están utilizando hilo para ejecutar la log de eventos, lo que puede causar problemas de sincronización y potencialmente de errores de acceso a la base de datos debido a la falta de manejo de la concurrencia.

En Python, los hilo no son tan eficientes para manejar la concurrencia como los hilo de Python, que son específicamente diseñados para manejar la concurrencia. Sin embargo, podemos implementar un método de ejecución paralela utilizando la biblioteca `concurrent.futures` para manejar la concurrencia.

Aquí te muestro cómo podrías corregir el código para utilizar hilo y manejar la concurrencia de manera segura y eficiente:

```python
import threading
import sqlite3
from concurrent.futures import ThreadPoolExecutor

class EventLogger:
    def __init__(self, db_path='events.db'):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.cursor.execute('CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)')
        self.conn.commit()

    def log(self, msg):
        self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))
        self.conn.commit()

    def log_parallel(self, msg):
        with self.conn:
            self.cursor.execute('INSERT INTO logs (msg) VALUES (?)', (msg,))

logger = EventLogger()
threads = []
for i in range(10):
    thread = threading.Thread(target=logger.log_parallel, args=(f'event_{i}',))
    threads.append(thread)
    thread.start()

for t in threads:
    t.join()

```

En este ejemplo, cada hilo ejecuta la función `log_parallel` con un parámetro diferente. Esto permite que cada hilo pueda ejecutar la función sin bloquear el proceso principal, lo que mejora la eficiencia y la concurrencia.

Además, utilizando `with self.conn` es una forma segura de manejar la base de datos, ya que asegura que la base de datos esté cerrada después de cada operación, incluso si algo sale mal.

Es importante mencionar que, aunque se han implementado métodos de ejecución paralelo, es posible que algunos errores de acceso a la base de datos puedan surgir debido a la falta de manejo de la concurrencia. Sin embargo, en general, este es un buen ejemplo de cómo se pueden manejar la concurrencia de manera segura y eficiente en Python.
```

---

### Prompt 3: Explicación técnica: epoll EPOLLLT vs EPOLLET y socket starvation (Linux/C)

**Instrucción / Prompt:**
```
Explica la diferencia técnica de kernel entre epoll con EPOLLLT (level-triggered) y EPOLLET (edge-triggered). ¿Qué condición provoca inanición de sockets (socket starvation) bajo alta carga en modo edge-triggered y qué patrón con sockets no bloqueantes y bucle read/recv previene este problema?
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.69 tok/s
- **TTFT inicial:** 5234 ms

```text
La diferencia técnica entre el kernel y epoll se basa en cómo se manejan los eventos de los sockets. Vamos a explicar cada uno:

1. Kernel: El kernel es el núcleo del sistema operativo y es responsable de gestionar los recursos del sistema, como los sockets. Cuando se crea un socket no bloqueante, el kernel se encarga de gestionar los eventos de este socket. En el caso de EPOLLLT y EPOLLET, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente.

2. EPOLLLT (level-triggered): En este modo, el evento se considera activo cuando el nivel de los eventos es mayor que el nivel de los eventos previos. Por ejemplo, si se han recibido varios eventos de un socket, el evento se considera activo cuando el número de eventos es mayor que el número de eventos previos.

3. EPOLLET (edge-triggered): En este modo, el evento se considera activo cuando el nivel de los eventos es igual al nivel de los eventos previos. Por ejemplo, si se han recibido varios eventos de un socket, el evento se considera activo cuando el número de eventos es igual al número de eventos previos.

En el caso de EPOLLLT, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente a EPOLLET. Cuando se utiliza EPOLLLT, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente a EPOLLET. Por ejemplo, si se han recibido varios eventos de un socket, el evento se considera activo cuando el número de eventos es mayor que el número de eventos previos.

En el caso de EPOLLET, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente a EPOLLLT. Cuando se utiliza EPOLLET, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente a EPOLLLT. Por ejemplo, si se han recibido varios eventos de un socket, el evento se considera activo cuando el número de eventos es igual al número de eventos previos.

En ambos casos, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente. La diferencia técnica entre el kernel y epoll se basa en cómo se manejan los eventos de los sockets. En el caso de EPOLLLT y EPOLLET, el kernel se encarga de gestionar los eventos de los sockets, pero de manera diferente.

La condición que provoca inanición de sockets (socket starvation) bajo alta carga en modo edge-triggered se basa en la cantidad de eventos que se han recibido en el socket. En el caso de EPOLLET, el evento se considera activo cuando el número de eventos es igual al número de eventos previos. Por lo tanto, si se han recibido varios eventos en el socket, el evento se considera activo cuando el número de eventos es igual al número de eventos previos.

En el caso de EPOLLL
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 8.77 tok/s
- **TTFT inicial:** 2038 ms

```text
**Diferencia técnica entre kernel y epoll con EPOLLLT y EPOLLET**

En el kernel de Unix, existen dos métodos para manejar la detección de eventos: `EPOLLLT` (level-triggered) y `EPOLLET` (edge-triggered). Estos métodos permiten a los desarrolladores controlar la frecuencia con la que se detectan los eventos, lo que puede influir en la eficiencia y la estabilidad del sistema.

**EPOLLLT (Level-Triggered)**

`EPOLLLT` es un método de detección de eventos que se activa cuando un evento se produce en un socket. Cuando un evento se produce, se envía un señal al kernel, que luego envía un mensaje al socket para informar que se ha producido el evento. El kernel puede entonces responder con la acción correcta.

**EPOLLET (Edge-Triggered)**

`EPOLLET` es un método de detección de eventos que se activa cuando un evento se produce en un socket cerca de la entrada de la red. Cuando un evento se produce, se envía un señal al kernel, que luego envía un mensaje al socket para informar que se ha producido el evento.

**Inanición de sockets (socket starvation) bajo alta carga en modo edge-triggered**

Cuando se utiliza `EPOLLLT` en modo edge-triggered, se puede producir socket starvation si:

* El sistema es muy concurrido y muchos sockets están activos al mismo tiempo.
* Los eventos se producen rápidamente, lo que puede causar que los sockets no tengan tiempo de responder antes de que se produzca el evento.

Por ejemplo, imagine que tienes un servidor web que recibe solicitudes de acceso a un archivo. Si muchos usuarios están conectados al mismo tiempo, es posible que algunos de ellos no puedan acceder a los archivos debido a socket starvation.

**Patrón con sockets no bloqueantes y bucle read/recv previene este problema**

Para prevenir socket starvation, se pueden utilizar patrones como:

* **Socket pooling**: Se almacenan múltiples sockets en un conjunto y se utilizan cuando se necesitan.
* **Event handling**: Se manejan eventos de manera asintmética, lo que permite que el sistema se concentre en otras tareas mientras se procesa el evento.
* **Caching**: Se almacenan respuestas a eventos en un cache para evitar que se necesite procesar el evento nuevamente.

Además, se pueden utilizar técnicas como:

* **Asignación dinámica de sockets**: Se asignan y desasignan sockets dinámicamente para evitar la sobrecarga de recursos.
* **Uso de sockets con un número de filas**: Se utilizan sockets con un número de filas para evitar la sobrecarga de recursos.

En resumen, la combinación de `EPOLLLT` y `EPOLLET` puede causar socket starvation si se utiliza en modo edge-triggered. Para prevenir este problema
```

---

### Prompt 4: Script: Verificador de salud HTTP concurrente con asyncio y tabla ASCII (Python)

**Instrucción / Prompt:**
```
Escribe un script en Python 3 usando asyncio y httpx que tome una lista de URLs, ejecute chequeos concurrentes limitados a 10 tareas simultáneas mediante Semaphore, mida TTFB con timeout de 3s, capture excepciones de conexión, y formatee la salida final en una tabla ASCII ordenada por latencia.
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 501 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.78 tok/s
- **TTFT inicial:** 5560 ms

```text
Aquí tienes un ejemplo de cómo podrías escribir este script en Python 3 utilizando `asyncio` y `httpx`:

```python
import asyncio
import httpx
from tabulate import tabulate

# Definimos una función para realizar la solicitud
async def request(url):
    try:
        response = await httpx.get(url, timeout=3)
        return response
    except httpx.HTTPError as e:
        print(f"Error connecting to {url}: {e}")
    except httpx.ConnectError as e:
        print(f"Error connecting to {url}: {e}")
    return None

# Definimos una función para calcular el TTFB
async def measure_ttfb(url, response):
    if response is not None:
        start_time = response.start_time
        end_time = response.end_time
        ttfb = end_time - start_time
        return ttfb
    return None

# Definimos una función para formatear la salida
def format_output(urls):
    table = []
    for url in urls:
        ttfb = await measure_ttfb(url, response)
        table.append([url, ttfb])
    return table

# Definimos una función para ejecutar las tareas concurrentemente
async def execute_tasks(urls):
    semaphore = asyncio.Semaphore(10)
    tasks = []
    for url in urls:
        task = asyncio.create_task(request(url))
        task = asyncio.create_task(measure_ttfb(url, response))
        tasks.append(task)
    await asyncio.gather(*tasks, semaphore=semaphore)

# Ejecución del script
if __name__ == "__main__":
    urls = ["https://example.com", "https://another-example.com"]
    table = format_output(urls)
    for row in table:
        print(f"{row[0]:<50} {row[1]:<10} ms")
```

Este script utiliza `asyncio` para ejecutar las tareas de manera concurrente y `httpx` para realizar las solicitudes HTTP. También utiliza `tabulate` para formatear la salida en una tabla ASCII ordenada por latencia.

Recuerda instalar `tabulate` utilizando `pip` antes de ejecutar este script:

```
pip install tabulate
```

Este script es solo un ejemplo y puede necesitar ajustes según tus requisitos específicos.
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 644 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.19 tok/s
- **TTFT inicial:** 2884 ms

```text
Aquí te dejo un script en Python 3 utilizando `asyncio`, `httpx` y `asyncio` para ejecutar chequeos concurrentes limitados a 10 tareas simultáneas, mide el TTFB con un timeout de 3 segundos, captura excepciones de conexión y formaatee la salida final en una tabla ASCII ordenada por latencia.

```python
import asyncio
import httpx
import random
import time
import pandas as pd
from typing import List

# Simulación de conexión a un servidor
async def conecta_server(url: str) -> httpx.Client:
    async with httpx.AsyncClient() as client:
        return client

# Simulación de chequeo
async def chequea(url: str) -> float:
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        response = await client.get(url)
        end_time = time.time()
        ttfb = end_time - start_time
        return ttfb

# Simulación de ejecución de chequeos concurrentes
async def ejecuta_cheques(urls: List[str], semaphore: int) -> List[float]:
    tasks = []
    for url in urls:
        task = asyncio.create_task(chequea(url))
        tasks.append(task)
    results = [await task for task in tasks]
    return results

# Simulación de ejecución de chequeos con Semaphore
async def ejecuta_cheques_con_semaphore(urls: List[str], semaphore: int) -> List[float]:
    tasks = []
    for url in urls:
        task = asyncio.create_task(chequea(url, semaphore=semaphore))
        tasks.append(task)
    results = [await task for task in tasks]
    return results

# Simulación de ejecución de chequeos con Semaphore y timeout
async def ejecuta_cheques_con_timeout(urls: List[str], semaphore: int, timeout: int) -> List[float]:
    tasks = []
    for url in urls:
        task = asyncio.create_task(chequea(url, timeout=timeout, semaphore=semaphore))
        tasks.append(task)
    results = [await task for task in tasks]
    return results

# Simulación de ejecución de chequeos con Semaphore y timeout
async def ejecuta_cheques_con_timeout_con_semaphore(urls: List[str], semaphore: int, timeout: int) -> List[float]:
    tasks = []
    for url in urls:
        task = asyncio.create_task(chequea(url, timeout=timeout, semaphore=semaphore))
        tasks.append(task)
    results = [await task for task in tasks]
    return results

# Ejecución de chequeos
urls = ["http://example.com", "http://example2.com", "http://example3.com"] * 10
semaphore = 10
timeout = 3

results_con_semaphore = await ejecuta_cheques_con_semaphore(urls, semaphore)
results_con_timeout = await ejecuta_cheques_con_timeout(urls, semaphore, timeout)
results_con_timeout_con_semaphore = await ejecuta_cheques_con_timeout_con_semaphore
```

---

### Prompt 5: Tipado avanzado: DeepReadonly<T> recursivo (TypeScript)

**Instrucción / Prompt:**
```
Diseña el tipo utilitario genérico DeepReadonly<T> en TypeScript estricto. Debe hacer recursivamente readonly a objetos, arrays, tuplas, Map y Set, pero debe preservar intactos tipos primitivos, funciones, RegExp y Date.
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 308 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.83 tok/s
- **TTFT inicial:** 4390 ms

```text
Aquí tienes un ejemplo de cómo podrías diseñar el tipo utilitario genérico `DeepReadonly<T>` en TypeScript estricto:

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

// Ejemplo de uso
interface Person {
  name: string;
  age: number;
}

const person: DeepReadonly<Person> = {
  name: "John",
  age: 30,
};

// Preservar tipos primitivos, funciones, RegExp y Date
type PrimitiveTypes = string | number | boolean;
type FunctionTypes = (...args: any) => any;
type RegExpTypes = RegExp;
type DateTypes = Date;

// Ejemplo de uso con tipos primitivos, funciones, RegExp y Date
const primitive: DeepReadonly<PrimitiveTypes> = {
  string: "Hello",
  number: 42,
  boolean: true,
};

const functionType: DeepReadonly<FunctionTypes> = {
  add: (a: number, b: number) => a + b,
};

const regex: DeepReadonly<RegExpTypes> = {
  pattern: /hello/g,
};

const date: DeepReadonly<DateTypes> = {
  date: new Date(),
};
```

Este tipo `DeepReadonly<T>` hace recursivamente readonly a objetos, arrays, tuplas, Map y Set, pero preserva intactos tipos primitivos, funciones, RegExp y Date.
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 649 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.28 tok/s
- **TTFT inicial:** 15999 ms

```text
# DeepReadonly<T> en TypeScript

Como desarrollador de software, es importante diseñar estructuras de datos y tipos de datos que sean no obstrutivos y fáciles de entender y manipular. En este caso, diseñaremos el tipo `DeepReadonly<T>` en TypeScript, que es un tipo genérico que permite preservar tipos primitivos, funciones, RegExp y Date, mientras que también permite hacer recursivamente readonly a objetos, arrays, tuplas, Map y Set.

## Definición del tipo `DeepReadonly<T>`

```typescript
type DeepReadonly<T> = 
  | readonly T
  | readonly [keyof T][keyof T]
  | readonly { readonly [keyof T]: T } as T;
```

En este tipo, `T` es el tipo que se desea preservar, y `DeepReadonly<T>` es un tipo genérico que permite hacer readonly a objetos, arrays, tuplas, Map y Set. La sintaxis es similar a la de `readonly`, pero con un tipo genérico `T` que se puede reemplazar con cualquier tipo.

## Implementación de `DeepReadonly<T>` en TypeScript

```typescript
function deepReadonly<T>(value: T): DeepReadonly<T> {
  if (Array.isArray(value)) {
    return deepReadonly(value as any[] as T);
  } else if (typeof value === 'object' && value !== null) {
    return deepReadonly(value as any) as T;
  } else if (value instanceof Date) {
    return deepReadonly(value) as T;
  } else if (value instanceof RegExp) {
    return deepReadonly(value) as T;
  } else if (value instanceof Function) {
    return deepReadonly(value) as T;
  } else {
    return value;
  }
}
```

En esta implementación, utilizamos una estructura de recursividad para hacer readonly a objetos, arrays, tuplas, Map y Set. También utilizamos la sintaxis de `readonly` para hacer readonly a funciones y RegExp.

## Ejemplo de uso de `DeepReadonly<T>`

```typescript
const valor: number = 5;
console.log(deepReadonly(valor)); // 5

const valorFijo: number = 10;
console.log(deepReadonly(valorFijo)); // 10

const valorFijoArray: number[] = [1, 2, 3];
console.log(deepReadonly(valorFijoArray)); // [1, 2, 3]

const valorFijoObj: { a: number, b: string } = { a: 1, b: '2' };
console.log(deepReadonly(valorFijoObj)); // { a: 1, b: '2'}

const valorFijoMap: Map<number, string> = new Map([1, 'a'], [2, 'b'], [3, 'c']);
console.log(deepReadonly(valorFijoMap)); // Map(3, { get: (k) => k, size:
```

---

### Prompt 6: Concurrencia / Memory Ordering: Spinlock Relaxed vs Acquire/Release (Rust)

**Instrucción / Prompt:**
```
Analiza este intento de spinlock en Rust:
```rust
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    pub fn new() -> Self {
        Self { locked: AtomicBool::new(false) }
    }
    pub fn lock(&self) {
        while self.locked.swap(true, Ordering::Relaxed) {
            std::hint::spin_loop();
        }
    }
    pub fn unlock(&self) {
        self.locked.store(false, Ordering::Relaxed);
    }
}
```
¿Por qué Ordering::Relaxed es incorrecto y permite dataraces en arquitecturas débilmente ordenadas (ARM)? Indica la combinación mínima de ordenamiento de memoria (Acquire/Release) requerida y escribe el código corregido.
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 338 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.73 tok/s
- **TTFT inicial:** 11435 ms

```text
El uso de Ordering::Relaxed en el intento de spinlock proporcionado es incorrecto y puede permitir dataraces en arquitecturas débilmente ordenadas (ARM). Esto se debe a que Ordering::Relaxed permite la reordenación de la memoria, lo que puede causar problemas de sincronización en sistemas con diferentes niveles de ordenamiento de memoria.

Para corregir este problema, se debe utilizar Ordering::AcqRel para garantizar la correcta sincronización de memoria. Ordering::AcqRel proporciona la combinación mínima de ordenamiento de memoria requerida para el spinlock, que es acquire (para obtener una vista de la variable) y release (para garantizar la correcta sincronización de memoria).

Aquí está el código corregido:

```rust
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    pub fn new() -> Self {
        Self { locked: AtomicBool::new(false) }
    }
    pub fn lock(&self) {
        while self.locked.swap(true, Ordering::AcqRel) {
            std::hint::spin_loop();
        }
    }
    pub fn unlock(&self) {
        self.locked.store(false, Ordering::RelRel);
    }
}
```

En el código corregido, se utiliza Ordering::AcqRel en lugar de Ordering::Relaxed para garantizar la correcta sincronización de memoria. Además, se utiliza Ordering::RelRel para garantizar que la variable se actualiza correctamente después de la liberación del lock.
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 412 (verificados por `/tokenize`)
- **Velocidad de generación:** 4.42 tok/s
- **TTFT inicial:** 6398 ms

```text
El uso de `Ordering::Relaxed` en `std::sync::atomic::AtomicBool` es incorrecto y puede causar dataraces en arquitecturas débilmente ordenadas (ARM).

En primer lugar, `Ordering::Relaxed` no es un valor válido en `std::sync::atomic::AtomicBool`. En lugar de eso, se utiliza `Ordering::Relaxed` en `std::sync::atomic::AtomicBool::try_lock` y `std::sync::atomic::AtomicBool::try_unlock`.

En segundo lugar, `Ordering::Relaxed` no es necesario en este caso. La propiedad `AtomicBool` ya tiene un valor de estado establecido, que es `false`. Por lo tanto, no hay necesidad de usar `Ordering::Relaxed` para evitar dataraces.

La combinación mínima de ordenamiento de memoria (Acquire/Release) requerida para `std::sync::atomic::AtomicBool` es `Acquire`-`Release`. En este caso, la propiedad `AtomicBool` se puede acceder y modificar de manera segura sin necesidad de usar `Ordering::Relaxed`.

Por lo tanto, el código corregido es:

```rust
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SpinLock {
    locked: AtomicBool,
}

impl SpinLock {
    pub fn new() -> Self {
        Self { locked: AtomicBool::new(false) }
    }
    pub fn lock(&self) {
        self.locked.try_lock().unwrap();
    }
    pub fn unlock(&self) {
        self.locked.try_unlock().unwrap();
    }
}
```

En este código, se utiliza `try_lock` y `try_unlock` para acceder y modificar la propiedad `AtomicBool` de manera segura. Estos métodos no requieren `Ordering::Relaxed` y garantizan que la propiedad se pueda acceder y modificar de manera segura.
```

---

### Prompt 7: Streams / Backpressure: Pipeline de descompresión y validación CSV (Node.js)

**Instrucción / Prompt:**
```
Implementa en Node.js moderno usando stream.pipeline, zlib.createGunzip y stream.Transform un flujo que procese un archivo CSV comprimido (.csv.gz) de varios gigabytes línea por línea: valide que contenga 4 columnas numéricas requeridas, envíe los registros válidos al stdout y escriba las líneas corruptas en un archivo de errores, garantizando manejo correcto de contrapresión (backpressure).
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.7 tok/s
- **TTFT inicial:** 6380 ms

```text
Aquí tienes un ejemplo de código en Node.js que procesa un archivo CSV comprimido (.csv.gz) de varios gigabytes línea por línea, validando que contenga 4 columnas numéricas requeridas. Los registros válidos se envían al stdout y las líneas corruptas se escriben en un archivo de errores.

```javascript
const fs = require('fs');
const zlib = require('zlib');
const { pipeline, Transform } = require('stream');

// Función que valida si un registro es válido
const isValidRecord = (record) => {
  const [header, ...rows] = record;
  return header === 'column1' && header === 'column2' && header === 'column3' && header === 'column4';
};

// Función que procesa el archivo CSV comprimido
const processCsvFile = (inputFile, outputFile) => {
  // Crear un flujo de entrada para leer el archivo comprimido
  const input = fs.createReadStream(inputFile);

  // Crear un flujo de salida para escribir los registros válidos
  const output = fs.createWriteStream(outputFile);

  // Crear un flujo de transformación para validar los registros
  const validation = new Transform({
    transform: (record, encoding, callback) => {
      const validRecord = isValidRecord(record);
      callback(null, validRecord ? record : null);
    },
  });

  // Crear un flujo de pila para procesar el archivo CSV comprimido
  const pipeline = pipeline(input, validation, output);

  // Manejar la contrapresión (backpressure)
  pipeline.on('error', (error) => {
    console.error(`Error occurred: ${error.message}`);
  });

  // Iniciar el flujo de pila
  pipeline.on('finish', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('data', (data, encoding) => {
    console.log(`Processing data: ${data}`);
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log('Processing of CSV file completed.');
  });

  // Iniciar el flujo de pila
  pipeline.on('end', () => {
    console.log
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 652 (verificados por `/tokenize`)
- **Velocidad de generación:** 4.58 tok/s
- **TTFT inicial:** 6672 ms

```text
Aquí te muestro un ejemplo de cómo implementarías el flujo que describes utilizando Node.js moderno y las bibliotecas `stream.pipeline`, `zlib.createGunzip` y `stream.Transform`. Este ejemplo utiliza un método de manejo de contrapresión (backpressure) para asegurar que el flujo de procesamiento se ajuste a la velocidad del archivo.

```javascript
const fs = require('fs');
const zlib = require('zlib');
const { Transform } = require('stream');
const { Transform as StreamTransform } = require('stream');

// Función para leer un archivo CSV
function leerArchivoCSV(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, archivo) => {
      if (err) {
        reject(err);
      } else {
        const csv = archivo.toString('utf8');
        const lines = csv.split('\n');
        resolve(lines);
      }
    });
  });
}

// Función para procesar un archivo CSV
function procesarArchivoCSV(lines, callback) {
  const csv = lines[0];
  const columnas = csv.split(',').map(Number);
  const registros = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      const [n1, n2, n3, n4] = line.split(',').map(Number);
      if (n1 >= 0 && n2 >= 0 && n3 >= 0 && n4 >= 0) {
        registros.push({ n1, n2, n3, n4 });
      }
    }
  }

  callback(registros);
}

// Función para procesar un archivo CSV y enviar los registros al stdout
function procesarArchivoCSVCompleto(lines) {
  const csv = lines[0];
  const columnas = csv.split(',').map(Number);
  const registros = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      const [n1, n2, n3, n4] = line.split(',').map(Number);
      if (n1 >= 0 && n2 >= 0 && n3 >= 0 && n4 >= 0) {
        registros.push({ n1, n2, n3, n4 });
      }
    }
  }

  return registros;
}

// Función para procesar un archivo CSV y escribir los registros en un archivo de errores
function procesarArchivoCSVErrores(lines) {
  const csv = lines[0];
  const columnas = csv.split(',').map(Number);
  const registros = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line) {
      const [n1, n2, n3, n4] = line.split(',').map(Number);
      if (n1 >= 0 && n2 >= 0 && n3 >= 0 && n4 >= 0)
```

---

### Prompt 8: Patrón de arquitectura: Transactional Outbox para mensajería fiable (Python)

**Instrucción / Prompt:**
```
Describe e implementa en Python (con SQL o SQLAlchemy / psycopg) el patrón Transactional Outbox para emitir eventos hacia RabbitMQ/Kafka al guardar una entidad Order. Muestra la estructura de la tabla outbox, la transacción atómica de guardado y el worker poller en background con SELECT FOR UPDATE SKIP LOCKED que evita duplicados.
```

#### Respuesta Modelo 3B (Dolphin 3B Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 5.7 tok/s
- **TTFT inicial:** 5614 ms

```text
El patrón Transactional Outbox es una técnica utilizada para emitir eventos hacia RabbitMQ/Kafka al guardar una entidad. En este caso, vamos a implementarlo en Python utilizando SQL o SQLAlchemy/psycopg para la base de datos.

Primero, necesitamos instalar las dependencias necesarias para este ejemplo. Podemos usar SQLAlchemy para interactuar con la base de datos y RabbitMQ para enviar los eventos.

```bash
pip install sqlalchemy psycopg2-binary rabbitmqpy
```

Ahora, vamos a crear la estructura de la tabla outbox y la transacción atómica de guardado.

```python
from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from psycopg2 import sql
from rabbitmqpy import exceptions

# Base de la clase declarativa
Base = declarative_base()

# Creación de la tabla outbox
outbox = Table('outbox', Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('order_id', Integer),
    Column('event_type', String),
    Column('event_data', String),
    Column('created_at', String),
    Column('updated_at', String),
    ForeignKey('orders.id')
)

# Clase declarativa para la entidad Order
class Order(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    # Otros campos de la entidad Order

# Creación de la sesión de la base de datos
Session = sessionmaker(bind=engine)

# Creación de la transacción atómica de guardado
def save_order(order_id, event_type, event_data):
    session = Session()
    transaction = session.begin()
    
    # Guardar la entidad Order
    order = Order(id=order_id)
    session.add(order)
    
    # Guardar la entidad Event en la tabla outbox
    event = Event(order_id=order_id, event_type=event_type, event_data=event_data)
    session.add(event)
    
    transaction.commit()
    session.close()

# Creación de la estructura de la tabla outbox
outbox_table = Table('outbox_table', Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('order_id', Integer),
    Column('event_type', String),
    Column('event_data', String),
    Column('created_at', String),
    Column('updated_at', String),
    ForeignKey('orders.id')
)

# Creación de la estructura de la tabla outbox
outbox_table = Table('outbox_table', Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('order_id', Integer),
    Column('event_type', String),
    Column('event_data', String),
    Column('created_at', String),
    Column('updated_at', String),
    ForeignKey('orders.id')
)

# Creación de la estructura de la tabla outbox
outbox_table = Table('outbox_table', Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('order_id',
```

#### Respuesta Modelo 1B (Llama 3.2 1B Instruct Q4_K_M)
- **Tokens generados:** 650 (verificados por `/tokenize`)
- **Velocidad de generación:** 10.77 tok/s
- **TTFT inicial:** 2003 ms

```text
**Transactional Outbox Implementación en Python (con SQLAlchemy y RabbitMQ/Kafka)**

En este ejemplo, implementaremos un patrón de transacción de outbox para emitir eventos hacia RabbitMQ/Kafka al guardar una entidad `Order` utilizando SQLAlchemy y RabbitMQ/Kafka.

**Estructura de la Base de Datos**

 Primero, definamos la estructura de la base de datos que utilizará nuestro patrón de transacción de outbox.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_outboxes (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Implementación del Patrón de Transacción de Outbox**

A continuación, implementaremos el patrón de transacción de outbox utilizando SQLAlchemy y RabbitMQ/Kafka.

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import List
import json
import threading
import time
import random

# Configuración de la base de datos
engine = create_engine('postgresql://user:password@host:port/dbname')

# Creación de la base de datos
Base = declarative_base()

# Clase para representar la entidad Order
class Order(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, nullable=False)
    order_date = Column(Date, nullable=False)
    total = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now)

# Clase para representar la entidad OrderOutbox
class OrderOutbox(Base):
    __tablename__ = 'order_outboxes'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, nullable=False)
    event_type = Column(String(50), nullable=False)
    event_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now)

# Clase para realizar la transacción de outbox
class Transaction:
    def __init__(self, engine, session):
        self.engine = engine
        self.session = session

    def save_order(self, order):
        # Guardar la entidad Order
        order.save(self.session)

        # Crear una nueva entidad OrderOutbox
        order_outbox = OrderOutbox(
            order_id=order.id,
            event_type='save_order',
            event_data=json.dumps(order)
        )
        order_outbox.save(self.session)

        # Agregar la entidad OrderOutbox al outbox
```

---

