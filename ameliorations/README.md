---
prev: /presentation/existant
sidebarDepth: 2
---

# Améliorations apportées

## Remise en forme du CSS
(Responsive + Slider)
-	Faire correspondre le site à la charte graphique du Cd54 et de la maquette qui avait été faite par M. Vitoux
-	Rendre l’interface responsive (avec flex, grid)
-	Ajout d’un slider (carrousel) horizontal pour la liste des couches en petit écran + slider vertical pour la liste des objets d’une couche --> utilisation de Swiperjs, un librairie de slider compatible avec le mobile.

## Editable

__Problème :__ Modifier la géométrie d’un polygone

On clique pour ajouter un point à la suite du dernier --> pas possible de déplacer ou supprimer un point déjà existant ou d’en ajouter un entre 2. Pour pouvoir se corriger il faut supprimer l’objet et le recréer --> on perd toutes les données de sa fiche.

__Idée__ : Pouvoir déplacer ou supprimer un point déjà existant ou en ajouter un entre 2 sans avoir à supprimer l’objet

__Solution__ : Utilisation du plugin [Leaflet Editable](https://github.com/Leaflet/Leaflet.Editable) qui le permet.

__Problème intermédiaire :__ Souci de coordonnées dupliquées
Lorsque l’on sauvegarde un objet, la première coordonnée est dupliquée ce qui nous fait 2 points se superposant (cela se produisant à chaque sauvegarde). Ici il s’agit d’un astuce qu’avait mis en place Hugo. En effet PostGIS considère en polygone valide que si la première coordonnée est identique à la dernière (pour pouvoir refermer la forme), contrairement Leaflet qui n’ayant pas besoin de ce doublon le considère comme un autre point. L’astuce de Hugo était donc de dupliquer cette coordonnée avant de l’envoyer dans la BDD PostGIS. Cependant en recevoir les informations de la BDD, on récupérait le doublon. 

__Solution :__ Retirer le doublon --> exemple du code

```javascript
get coordinates () {
    let g = this.properties.geometry;
    if(g.value){
        if ((g.type=='gml:MultiPolygonPropertyType') 
            && (g.value.coordinates.length >= 3)) {
            
            /* Dans le cas où le premier point a été duppliqué
            pour fermer le polygone, on supprime le doublon, 
            qui est le dernier point. */
            let firstCoord = g.value.coordinates[0];
            let lastCoord = g.value.coordinates[g.value.coordinates.length -1 ];
            if (firstCoord[0] == lastCoord[0] && firstCoord[1] == lastCoord[1]) {
                g.value.coordinates.pop();
            }
        }
        return g.value.coordinates;
    }else return null
}
```

## Ligne brisée (Polyline)
L’application ne prenait en compte que les objets de type point (marker) et polygone. L’implémentation des lignes brisés pour par exemple des routes ou des lignes électriques ou internet était indispensable. Je me suis basé sur ce qui avait été déjà fait pour les polygone pour l’adapter aux polylignes que ce soit du côté Leaflet ou pour la structure de la requête vers PostGIS. Je vais me permettre le néologisme polyligne à partir de l’anglais polyline (comme polygone et polygon) pour désigner les lignes brisées.

__Problème :__ Différenciation entre les types des objets
Lorsque Hugo avait besoin de faire la différence entre un point et un polygone, il testait les coordonnées : si il n’y avait qu’un couple de latitude-longitude, il s’agit d’un point, s’il y en a plusieurs c’est un polygone. Or une polyligne est aussi composé de plusieurs coordonnées, il me fallait donc tester directement le type de l’objet pour savoir s’il s’agit d’un polygone ou d’une polyligne.

Il ne me manquais plus qu’à adapter le mode éditable, et les polylignes sont implémentées.

## Outils de mesures
Suite à une réunion avec Mme Arts, la directrice du Pôle Dévelopement, pour lui montrer les avancées de l’application, grâce à son point de vue plus global du projet, elle nous avait proposé de nouvelles fonctionnalités : la possibilité de sélectionner différents fond de carte (entre vue satellite et vue de plan) + des outils pour pouvoir mesurer des périmètres, distances ou surfaces.

### Description des différentes fonctionnalités de mesures
-	Affichage sur les polygones leur aire et périmètre et sur les polylignes la distance totale.
-	Mesure rapide/à la volée de distances ou de surfaces (sans créer un objet dans la BDD).
-	Remplissage automatique des champs aire et périmètre (pour les polygones) et du champ distance (pour les polylignes).

### Implémentation de ces fonctionnalités
Pour l’affichage des mesures sur les objets j’ai utilisé le plugin [Leaflet Measure Path de ProminentEdge](https://github.com/ProminentEdge/leaflet-measure-path) en modifiant l’affichage pour des raisons de lisibilité. 

Pour les outils de mesures rapides, j’ai créé un nouveau module dans le store nommé QuickMeasure qui stocke l’objet Leaflet en construction, les méthodes pour ajouter, modifier et supprimer les sommets de l’objet ainsi que le type d’objet qui est initialisé par ce bouton Image du bouton. Les mesures sont affichées avec le plugin Leaflet Measure Path et l’objet est modifiable grâce au plugin Editable.
Pour le remplissage automatique des champs, la méthode updateMeasurements est appelée à chaque modification de la géométrie d’un objet et fait la mise à jour automatique des champs aire et périmètre ou distance.

-	Le périmètre est calculé grâce aux méthodes accumulatedLengths et length du plugin [Leaflet.GeometryUtil de MakinaCorpus](https://github.com/makinacorpus/Leaflet.GeometryUtil)
-	L’aire est calculée grâce à la méthode geodesicArea de du plugin [Leaflet.Draw](https://github.com/Leaflet/Leaflet.draw)
-	La distance totale est calculé grâce à length de Leaflet.GeometryUtil

```javascript
get perimeter (){
    if (this.representation 
        && this.properties.geometry.type == 'gml:MultiPolygonPropertyType') {
        let coordinates = this.representation._latlngs[0];
        /*
        accumulatedLengths() calcule la distance totale des segments d'un tableau
        de coordonnées. Or pour calculer le périmètre d'un polygone, il manque 
        le dernier côté entre le premier et le dernier point de ce tableau. On le 
        calcule séparement avec la méthode length et on l'ajoute en suite.
         */
        let allSides =  L.GeometryUtil.accumulatedLengths(coordinates);
        let lastSide = L.GeometryUtil.length([coordinates[0], 
                       coordinates[coordinates.length-1]]);
        let perimeter = allSides[allSides.length-1] + lastSide;
        return Math.round(perimeter);
    }
    return null;
}

get area (){
    if (this.representation 
        && this.properties.geometry.type == 'gml:MultiPolygonPropertyType') {
        let area = L.GeometryUtil.geodesicArea(this.representation._latlngs[0]);
        return Math.round(area);
    }
    return null;
}

get totalDistance (){
    if (this.representation 
        && this.properties.geometry.type == 'gml:MultiLineStringPropertyType') {
        /*
        Contrairement à son utilisation dans get perimeter, ici length() reçoit 
        directement une polyligne et renvoie la distance totale de la polyligne
        */
        let totalDistance = L.GeometryUtil.length(this.representation);
        return Math.round(totalDistance);
    }
    return null;
}

updateMeasurements () {
    if(this.perimeter!=null) this.properties.perimeter.value=this.perimeter;
    if(this.area!=null) this.properties.area.value=this.area;
    if(this.totalDistance!=null) this.properties.longueur.value=this.totalDistance;
}
```
## Configuration de la mise en forme de la fiche/formulaire
