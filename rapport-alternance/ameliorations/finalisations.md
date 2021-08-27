---
prev: /ameliorations/fileAPI
next: /conclusion/
sidebarDepth: 2
---

# Finalisations

___D'avril à août___

Après avoir mis en place fileAPI et l'avoir fait communiquer, il me reste à régler quelques détails et problèmes.

## Carte 
### Changement de fond de cartes
Bien que la possibilité de choisir entre plusieurs fonds de cartes Leaflet avait été mise en place suite à la réunion avec Mme Arts, les 2 fonds choisis étaient marqués en dur dans l'application. 

J'ai donc ajouté dans la partie `map` du fichier de configuration une liste `baseLayers` qui me permet d'ajouter les fonds de cartes que l'on souhaite.

__Code__ 
```javascript
if (layers.length) {
    layers.forEach((layer) => {
        baseLayers[layer.name] = L.tileLayer(layer.uri, {
            attribution: layer.attribution,
            minZoom: minZoom,
            maxZoom: 18
        })
        // si préciser dans le fichier de configuraiton
        // ce fond sera celui affiché par défaut
        if(layer.default) defaultLayer = layer.name;
    })
}else {
    // au cas où aucun fond n'a été mis dans le fichier de configuration
    // nous appliquons un fond par défaut
    baseLayers = {
        Satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'données © ESRI.WorldImagery',
            minZoom: minZoom,
            maxZoom: 18
        })
    }
    defaultLayer = 'Satellite'
}
// ajout du fond par défaut à l'affichage de la carte
// si non défini, on prend le premier de la liste
if(defaultLayer==null) defaultLayer = Object.keys(baseLayers)[0]
baseLayers[defaultLayer].addTo(map)

L.control.layers(baseLayers).addTo(map);
```

### Limiter le déplacement
J'ai ajouté la possibilité de ne pas pouvoir se déplacer au-delà de notre emprise (= zone visible sur notre carte, qui peut être un bourg en particulier, le département, la France ou bien le monde entier). Cette emprise est définie par 3 paramètres dans le fichier de configuration :
- `x` : la latitude du centre de la carte,
- `y` : la longitude du centre de la carte,
- `minZoom` : le zoom minimum sur la carte ( valeur à laquelle on ne peut plus dézoomer).
J'y ai ajouté le paramètre `isLimited` qui est un booléen qui permet de bloquer la carte à l'emprise ou bien de permettre de se déplacer librement autour.

__Problème__ : Tremblement l'affichage

__Solution__ : Zoomer de +1 lors de l'affichage de la carte, le tremblement disparaît.

__Code__
```javascript
if (isLimited) map.setMaxBounds(map.getBounds());

map.setZoom(minZoom+1)
```

### Paramètres dans l'URL
J'ai eu l'idée de permettre de changer l'emprise de la carte directement dans l'application en ajoutant des paramètres dans l'URL. Ce sont les 4 paramètres cités précédemment, dont les valeurs par défaut sont définis dans le fichier de configuration.

Par exemple :
- `myCartoGIS.app/?x=50&y=50&minZoom=10&isLimited=false`
- `myCartogis.app/?isLimited=false`

### Centrer sur objet
__Problème__ : Lorsque nous cliquons sur un objet pour le sélectionner, il se peut que celui-ci devienne caché par le formulaire ou les boutons.

__Solution__ : Centrer la carte sur l'objet lors de la sélection.

__Code__
```javascript
// méthode appelée lorsqu'un objet est sélectionné
centerOnFeature (f) {
    // si l'objet est un polygone ou une polyligne, on choisit son centre
    // sinon on prend les coordonnées du marker 
    let c = (Array.isArray(f.coordinates[0])) ? f.representation.getBounds().getCenter() : [...f.coordinates];

    // En grand écran, on essaye de compenser l'apparition du formulaire en créant un décalage vers la droite
    if (!this.smallScreen && !this.formVisible) { 
        let e = this.map.getBounds()._northEast.lng - this.map.getCenter().lng;
        c[1]+=e*0.1
    }

    // Puis on centre la carte sur ce point
    this.map.panTo(c)
}
```

## Page 404
J'ai créé grâce au router de VueJS, une page 404 pour que l'utilisateur reste sur la page principale de l'application.

Le router était aussi nécessaire pour récupérer les paramètres dans l'URL

## Personnalisation du rendu des objets
Les objets QGIS peuvent avoir une représentation personnalisée (couleur, épaisseur du trait, ... pour les polygones et polylignes et marqueurs pour les points). Ces informations étant passées à l'application, j'ai pu personnaliser le rendu de chacun des objets.

## Gestion des types d'objets
Lorsque Hugo a créé l'application, le webservice comprenait des objets de type `Point` ou `MultiPolygon`. 

Puis lors de l'ajout des lignes brisés, nous avons ajouté une couche de linéaires qui utilisait des `MultiPolyline`.

Cependant lors d'un test permettant de voir si l'application s'adapte à un nouveau projet, nous nous sommes rendu compte que ce projet utilisait des `MultiPoint`, des `Polygon` et des `Polyline`, ce qui bloquait l'application.

Étant donné que ces types sont définis en base de données, il est impensable d'imposer l'utilisation des formes "simples" à la place des formes "multi" car cela impliquerait de devoir modifier la structure de chaque objet de chacune des couches concernées. Il faut donc que l'application gère ces 6 types.

J'ai ajouté un getter aux objets qui permet de connaître leur type de géométrie en regroupant les formes "simples" avec leurs formes "multi" respectives.

```javascript
get type () {
    let t = this.properties.geometry.type
    switch (this.properties.geometry.type) {
        case 'gml:MultiPolygonPropertyType':
        case 'gml:PolygonPropertyType':
            t='polygon';
            break;
        
        case 'gml:MultiLineStringPropertyType':
        case 'gml:LineStringPropertyType':
            t='polyline';
            break;

        case 'gml:MultiPointPropertyType':
        case 'gml:PointPropertyType':
            t='point';
            break;          
    }

    return t
}

```


## Design
J'ai dû améliorer le design général de l'application :
- Possibilité d'enlever le header avec un paramètre, `hasHeader` dans le fichier de configuration
- Uniformisations des boutons sur la carte, avec la création d'icônes,
- Ajout d'un slider pour la liste des types d'objets d'une couche. Ce slider est similaire à celui utilisé pour la liste des couches.


## Intégration de l'application dans le CMS
Le but ici est d'intégrer l'application CartoGIS54 dans le futur site d'infogeo54 qui fonctionne avec WordPress.

J'ai d'abord essayé d'insérer les fichiers compilés de l'application directement dans Wordpress, ce qui n'a pas été possible car Wordpress bloque pour des raisons de sécurité le contenu venant de fichiers javascript.

J'ai ensuite essayé d'intégrer l'application dans un iframe.
### Création d'un type de post Wordpress
Afin de pouvoir insérer n'importe quelle application dans le site web via un iframe, j'ai décidé de créer un nouveau type de post Wordpress nommé Iframe.

### En-têtes 
Lors de l'insertion de CartoGIS54 en iframe, j'ai eu des erreurs d'en-tête. J'ai ainsi dû ajouter les en-têtes `X-Frame-Options` et `Content-Security-Policy: frame-ancestors`. 

### Passage en HTTPS 
Pour éviter un problème de Mixed-Content (appels de fichiers depuis un serveur en HTTP depuis un site en HTTPS, ce qui est bloqué par tous les navigateurs actuels), nous avons dû passer CartoGIS54 en HTTPS ainsi que le webservice et le fileAPI.


## Documentation et future des applications
Étant donné que l'application doit être open-source et que je ne m'en occuperai plus l'année prochaine, il me faut documenter le plus possible l'application afin de faciliter la compréhension des futures personnes travaillant sur cette application.

### Ajout Jsdoc et README.md
::: tip JsDoc
JsDoc permet de documenter les fonctions, objets et modules JavaScript et TypeScript. Certains éditeurs de code peuvent utilisés la documentation JsDoc pour afficher des aides pour la saisie, la compréhension du rôle d'une fonction par exemple.
:::

J'ai documenté l'application grâce à JsDoc, en me penchant principalement sur les fonctions et objets les plus complexes à comprendre. 

En parallèle j'ai modifié le contenu des README.md pour encore une fois facilité la compréhension de l'application sur le GitHub

### Fichier modèle pour la configuration

À l'instar des fichiers model.api.config.json et model.pathToCert.json pour l'api, j'ai créé un fichier modèle [model.app.config.json](https://raw.githubusercontent.com/infogeo54/CartoGIS54/master/src/model.app.config.json) afin de remplir correctement le fichier de configuration.

### Mise à jour du guide d'utilisation
Hugo avait rédigé un guide complet pour le service SIG, concernant l'installation et la configuration de CartoGIS54, ainsi que l'utilisation du plugin etc. J'ai ainsi mis à jour les informations tout en ajoutant les parties que j'avais développé comme fileAPI.



### Passation de pouvoir
Rodolphe Drouet, qui était stagiaire, a été pris en alternance au SIG, l'année prochaine. Il va ainsi continuer le travail qu'il a effectué durant son stage (principalement le plugin QGIS), ainsi que CartoGIS54 et fileAPI.

Nous avons donc réussi à organiser un RDV pour que je puisse lui expliquer le fonctionnement des 2 applications, les fonctionnalités que j'ai implémentées ainsi que celles qui restent à implémenter. Parmi elles :
- Un système d'onglets dans la fiche descriptive,
- Le filtrage dans la requête du webservice, pour ne charger que les objets qui seront affichables,
- La gestion des erreurs depuis fileAPI, pour l'instant il s'agit seulement de message dans la console,
