# Síntesis Teórica: Núcleo de Aprendizaje Adaptativo

Este documento detalla la formulación conceptual y las ecuaciones/principios rectores para los tres mecanismos que conformarán el núcleo cognitivo de **PRESENT_SIMPLE**.

---

## 1. Formación Adaptativa de Categorías (Inspiración ART)

El objetivo es resolver el dilema estabilidad-plasticidad sin prefijar el número de categorías ni permitir el olvido catastrófico.

### Conceptos Clave:
- **Vector de Entrada ($x$):** Representación normalizada de una observación o atributo.
- **Prototipo de Categoría ($w_j$):** Vector de peso / centroide representativo del nodo $j$.
- **Función de Elección / Activación ($T_j$):**
  $$T_j = \frac{|x \wedge w_j|}{\alpha + |w_j|}$$
  determina qué categoría compite prioritariamente por representar la entrada.
- **Criterio de Vigilancia ($\rho \in [0, 1]$):**
  $$\text{Match}(x, w_J) = \frac{|x \wedge w_J|}{|x|} \ge \rho$$
  - Si el emparejamiento satisface la vigilancia $\rho$: La categoría $J$ *resuena* y actualiza su prototipo para incorporar la nueva información sin distorsionarse drásticamente.
  - Si el emparejamiento es inferior a $\rho$: La categoría actual se inhibe y se busca la siguiente candidata. Si ninguna supera la vigilancia, **se crea un nuevo nodo de categoría** inicializado con $x$.

---

## 2. Crecimiento Topológico Incremental (Inspiración GNG)

El objetivo es conectar las categorías prototípicas formando un grafo que capture la topología y coocurrencia natural de los datos, sin conocer la dimensionalidad intrínseca ni la cantidad de grupos.

### Dinámica de Grafo:
1. Para cada estímulo, se identifican los dos nodos más cercanos / de mayor activación: el ganador $s_1$ y el segundo ganador $s_2$.
2. **Conexión de Hebb:** Se crea una arista entre $s_1$ y $s_2$ si no existe, o se reinicia su edad a $0$ si ya existía.
3. **Envejecimiento y Poda:** Se incrementa la edad de todas las aristas conectadas a $s_1$. Las aristas que superen una edad máxima $a_{\max}$ se eliminan. Los nodos que quedan aislados (grado 0) se podan.
4. **Inserción periódica de nodos:** Basada en la acumulación de error o densidad de estímulos entre nodos con mayor discrepancia.

---

## 3. Codificación Predictiva y Señal de Sorpresa

El objetivo es dotar al sistema de expectativas contextuales o temporales, convirtiendo la discrepancia en la señal de ajuste.

### Dinámica Predictiva:
- **Expectativa Contextual ($\hat{x}_t$):** Estimación del siguiente estado o atributo a partir del estado actual y las aristas de transición del grafo:
  $$\hat{x}_t = f(\mathcal{S}_{t-1}, \mathcal{G})$$
- **Error de Predicción ($\varepsilon_t$):**
  $$\varepsilon_t = x_t - \hat{x}_t$$
- **Uso dual de $\varepsilon_t$:**
  1. **Ajuste local:** Modulación de la fuerza de los enlaces y la posición de los prototipos (aprendizaje hebbiano ponderado por error).
  2. **Señal de Sorpresa:** Un $\varepsilon_t$ bajo confirma una regularidad; un $\varepsilon_t$ moderado y recurrente señala una **novedad emergente**; un pico abrupto y aislado de $\varepsilon_t$ señala una **anomalía candidata**.

---

## 4. Interacción Unificada: Evaluación Tridimensional

Ante una observación $x$, el sistema calcula el vector de evaluación:

$$\mathcal{E}(x) = \Big( \underbrace{1 - \text{Match}(x, w)}_{\text{Distancia a Prototipo (ART)}}, \;\; \underbrace{\mathcal{D}_{\text{grafo}}(x, \text{Vecindario})}_{\text{Discrepancia Topológica (GNG)}}, \;\; \underbrace{\|\varepsilon_t\|}_{\text{Error de Predicción}} \Big)$$

Con base en $\mathcal{E}(x)$:
- **Régimen 1 (Conocido):** Todos los componentes son bajos $\rightarrow$ Refuerzo de pesos.
- **Régimen 2 (Novedad):** Componentes moderados pero coherentes $\rightarrow$ Plasticidad (nuevo nodo/enlace).
- **Régimen 3 (Anomalía):** Fuerte discrepancia contextual o error predictivo extremo $\rightarrow$ Alerta y explicación.
