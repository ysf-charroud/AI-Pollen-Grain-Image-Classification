
# Classification d'Images de Grains de Pollen par Intelligence Artificielle

Système de classification automatique de grains de pollen à partir d'images microscopiques, combinant un modèle de deep learning et une interface web permettant aux utilisateurs de corriger les prédictions afin d'améliorer le modèle au fil du temps.

---

## Table des matières

1. [Présentation du projet](#présentation-du-projet)
2. [Dataset](#dataset)
3. [Modèle d'intelligence artificielle](#modèle-dintelligence-artificielle)
4. [Application web](#application-web)
5. [Lancer le projet](#lancer-le-projet)
6. [API REST](#api-rest)
7. [Boucle d'amélioration continue](#boucle-damélioration-continue)

---

## Présentation du projet

Ce projet répond à un problème concret en botanique et en écologie : identifier l'espèce d'un grain de pollen à partir d'une image microscopique est une tâche longue et spécialisée. L'objectif est d'automatiser cette classification grâce au deep learning.

Le système se compose de deux parties :

- **Un notebook d'entraînement** (`main-pollen.ipynb`) qui construit et entraîne le modèle à partir du dataset Kaggle.
- **Une application web** (`app/`) qui permet à n'importe quel utilisateur de soumettre une image, d'obtenir une prédiction instantanée, et de valider ou corriger le résultat. Chaque correction est stockée pour enrichir le prochain cycle d'entraînement.

---

## Dataset

**Source** : [Pollen Grain Image Classification — Kaggle](https://www.kaggle.com/datasets/andrewmvd/pollen-grain-image-classification)

| Paramètre | Valeur |
|---|---|
| Images originales valides | 699 |
| Classes (espèces) | 21 |
| Images après augmentation | 5 240 |
| Split entraînement / validation | 80 % / 20 % |

### Les 21 espèces reconnues

`anadenanthera` · `arecaceae` · `arrabidaea` · `cecropia` · `chromolaena` · `combretum` · `croton` · `dipteryx` · `eucalipto` · `faramea` · `hyptis` · `mabea` · `matayba` · `mimosa` · `myrcia` · `protium` · `qualea` · `schinus` · `serjania` · `syagrus` · `tridax`

### Augmentation des données

Le dataset original étant petit (699 images), chaque image a été augmentée 7 fois sur disque avant l'entraînement (rotations, flips, zoom, contraste, luminosité), portant le total à **5 240 images**. Des couches d'augmentation supplémentaires sont également intégrées directement dans le modèle.

---

## Modèle d'intelligence artificielle

### Architecture

Le modèle utilise le **transfer learning** à partir de **MobileNetV2** pré-entraîné sur ImageNet, une approche particulièrement efficace sur des datasets de taille limitée.

```
Image (224×224×3)
       ↓
Augmentation (RandomFlip, RandomRotation, RandomZoom, RandomContrast)
       ↓
MobileNetV2 backbone (pré-entraîné, gelé en phase 1)
       ↓
GlobalAveragePooling2D
       ↓
Dropout(0.3) → Dense(128, ReLU) → Dropout(0.3)
       ↓
Dense(21, Softmax)  →  prédiction sur 21 classes
```

| Paramètre | Valeur |
|---|---|
| Paramètres totaux | 2 424 661 (~9,25 Mo) |
| Paramètres entraînables (phase 1) | 166 677 |
| Taille d'entrée | 224 × 224 pixels |
| Framework | TensorFlow 2.21 |

### Entraînement en deux phases

**Phase 1 — Entraînement de la tête de classification** (backbone gelé)
- Optimiseur : Adam (lr = 1e-3)
- Callbacks : EarlyStopping + ReduceLROnPlateau
- Résultat après 11 epochs : **précision validation = 93,8 %**

**Phase 2 — Fine-tuning** (30 dernières couches du backbone dégelées)
- Optimiseur : Adam (lr = 1e-5)
- EarlyStopping déclenché à l'epoch 16

### Résultats

| Metric | Entraînement | Validation |
|---|---|---|
| Meilleure précision | ~90,8 % | **93,8 %** |
| Meilleure loss | ~0,274 | 0,185 |

---

## Application web

L'application permet d'utiliser le modèle directement depuis un navigateur.

**Stack technique :**
- **Backend** : FastAPI + TensorFlow (Python)
- **Frontend** : React 18 + Vite
- **Base de données** : SQLite (corrections et images uploadées)

### Fonctionnement

1. L'utilisateur dépose une image (PNG ou JPG) dans l'interface.
2. Le backend prétraite l'image (redimensionnement à 224×224) et lance l'inférence.
3. L'interface affiche la **prédiction principale** avec son niveau de confiance, ainsi que le **top-5** des espèces les plus probables.
4. L'utilisateur peut **confirmer** la prédiction ou la **corriger** en sélectionnant la bonne espèce dans la liste.
5. Le résultat est enregistré en base de données avec le label validé.

---

## Lancer le projet

### Prérequis

- Python 3.10+ avec un environnement virtuel (`app/backend/.venv` déjà fourni)
- Node.js 18+

### Option 1 — Mode développement (deux serveurs séparés)

**1. Démarrer le backend**

```powershell
cd app\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```

Le backend est accessible sur `http://localhost:8000`.

**2. Démarrer le frontend**

```powershell
cd app\frontend
npm install       # première fois uniquement
npm run dev
```

L'interface est accessible sur `http://localhost:5173`. Les appels `/api` sont automatiquement redirigés vers le backend.

### Option 2 — Mode production (serveur unique)

```powershell
# 1. Construire le frontend
cd app\frontend
npm run build

# 2. Démarrer le backend (qui sert aussi le frontend compilé)
cd ..\backend
.\.venv\Scripts\Activate.ps1
python main.py
```

L'application complète est accessible sur `http://localhost:8000`.

### Fichiers requis

Le dossier `model/` doit contenir les trois fichiers suivants (déjà présents dans le dépôt) :

```
model/
├── model.keras          # modèle TensorFlow sauvegardé
├── class_names.json     # liste ordonnée des 21 espèces
└── metadata.json        # taille d'entrée et informations de preprocessing
```

---

## API REST

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/classes` | Retourne la liste des 21 espèces |
| `POST` | `/api/predict` | Soumet une image (`multipart/form-data`, champ `file`) — retourne le top-5 et un `sample_id` |
| `POST` | `/api/correct` | Enregistre la correction `{ sample_id, true_class, confirmed }` |
| `GET` | `/api/stats` | Nombre d'échantillons confirmés par classe |
| `GET` | `/api/sample/{id}` | Récupère l'image originale uploadée |

---

## Boucle d'amélioration continue

Chaque prédiction confirmée ou corrigée est stockée dans la base SQLite avec son label validé. Pour extraire les données en vue d'un réentraînement :

```sql
SELECT filename, true_class FROM samples WHERE confirmed = 1;
```

Les images correspondantes se trouvent dans `app/data/uploads/`. Il suffit de les organiser en dossiers par espèce, de les fusionner avec le dataset original, et de relancer `main-pollen.ipynb`.
