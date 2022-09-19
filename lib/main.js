import { Loader, LoaderUtils, FileLoader, Group, Vector3, BoxGeometry, Shape, Path, ExtrudeGeometry, SphereGeometry, ConeGeometry, TorusGeometry, BufferGeometry, MeshPhongMaterial, MeshBasicMaterial, Mesh } from "three";

class GDMLLoader extends Loader {
    constructor(manager) {
        super(manager)
    }

    load(url, onLoad, onProgress, onError) {
        const scope = this;
        const path = (scope.path === '') ? LoaderUtils.extractUrlBase(url) : scope.path;

        const loader = new FileLoader(scope.manager);
        loader.setPath(scope.path);
        loader.setRequestHeader(scope.requestHeader);
        loader.setWithCredentials(scope.withCredentials);
        loader.load(url, function (text) {

            try {

                onLoad(scope.parse(text, path));

            } catch (e) {

                if (onError) {

                    onError(e);

                } else {

                    console.error(e);

                }

                scope.manager.itemError(url);

            }

        }, onProgress, onError);
    }
    parse(text, path) {
        const GDML = new DOMParser().parseFromString(text, 'text/xml');

        const group = new Group();
        let defines = {};
        let geometries = {};
        let refs = {};
        let meshes;

        function parseDefines() {
            var elements = GDML.querySelectorAll('define');
            var defs = elements[0].childNodes;
            var name = '';
            var value;

            for (var i = 0; i < defs.length; i++) {

                var nodeName = defs[i].nodeName;
                var def = defs[i];

                if (nodeName === 'constant') {

                    name = def.getAttribute('name');
                    value = def.getAttribute('value');

                }

                if (nodeName === 'position') {

                    name = def.getAttribute('name');

                    var x = def.getAttribute('x');

                    if (!x) {
                        x = 0.0;
                    }

                    var y = def.getAttribute('y');

                    if (!y) {
                        y = 0.0;
                    }

                    var z = def.getAttribute('z');

                    if (!z) {
                        z = 0.0;
                    }

                    var position = new Vector3(x, y, z);
                    defines[name] = position;

                }

                if (nodeName === 'rotation') {

                    // Note: need to handle constants
                    // before this can be implemented

                    name = def.getAttribute('name');

                    var x = def.getAttribute('x');
                    var y = def.getAttribute('y');
                    var z = def.getAttribute('z');

                }

                if (nodeName === 'quantity') {

                    // Note: need to handle units

                    name = def.getAttribute('name');
                    var type = def.getAttribute('type');

                }

                if (nodeName === 'expression') {

                    name = def.getAttribute('name');

                }

            }

        }

        function parseSolids() {
            var elements = GDML.querySelectorAll('solids');
            var solids = elements[0].childNodes;
            var name = '';

            for (var i = 0; i < solids.length; i++) {

                var type = solids[i].nodeName;
                var solid = solids[i];

                if (type === 'box') {

                    name = solid.getAttribute('name');
                    var x = solid.getAttribute('x');
                    var y = solid.getAttribute('y');
                    var z = solid.getAttribute('z');

                    if (defines[x]) {
                        x = defines[x];
                    }

                    if (defines[y]) {
                        y = defines[y];
                    }

                    if (defines[z]) {
                        z = defines[z];
                    }

                    // x,y,z in GDML are half-widths
                    var geometry = new BoxGeometry(2 * x, 2 * y, 2 * z);
                    geometries[name] = geometry;

                }

                if (type === 'tube') {

                    // Note: need to handle units
                    var aunit = solid.getAttribute('aunit');
                    var lunit = solid.getAttribute('lunit');

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var rmin = solid.getAttribute('rmin');
                    var rmax = solid.getAttribute('rmax');
                    var z = solid.getAttribute('z');

                    var startphi = solid.getAttribute('startphi');
                    var deltaphi = solid.getAttribute('deltaphi');

                    if (aunit === 'deg') {
                        startphi *= Math.PI / 180.0;
                        deltaphi *= Math.PI / 180.0;
                    }

                    var shape = new Shape();
                    // x,y, radius, startAngle, endAngle, clockwise, rotation
                    shape.absarc(0, 0, rmax, startphi, deltaphi, false);

                    if (rmin > 0.0) {

                        var hole = new Path();
                        hole.absarc(0, 0, rmin, startphi, deltaphi, true);
                        shape.holes.push(hole);

                    }

                    var extrudeSettings = {
                        depth: z,//new version three.js use depth insted of amount.
                        steps: 1,
                        bevelEnabled: false,
                        curveSegments: 100 // set segment from 24 to 100
                    };

                    var geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.center();
                    geometries[name] = geometry;

                }

                if (type === 'sphere') {

                    name = solid.getAttribute('name');
                    var rmin = solid.getAttribute('rmin');
                    var rmax = solid.getAttribute('rmax');

                    var startphi = solid.getAttribute('startphi');
                    var deltaphi = solid.getAttribute('deltaphi');

                    var starttheta = solid.getAttribute('starttheta');
                    var deltatheta = solid.getAttribute('deltatheta');

                    var aunit = solid.getAttribute('aunit');

                    if (!rmin) {
                        rmin = 0.0;
                    }

                    if (!startphi) {
                        startphi = 0.0;
                    }

                    if (!starttheta) {
                        starttheta = 0.0;
                    }

                    if (aunit === 'deg') {

                        startphi *= Math.PI / 180.0;
                        deltaphi *= Math.PI / 180.0;

                        starttheta *= Math.PI / 180.0;
                        deltatheta *= Math.PI / 180.0;

                    }

                    // radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength
                    var sphere = new SphereGeometry(rmax, 32, 32, startphi, deltaphi, starttheta, deltatheta);
                    geometries[name] = sphere;

                }

                if (type === 'orb') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var r = solid.getAttribute('r');

                    var sphere = new SphereGeometry(r, 32, 32, 0.0, 2 * Math.PI, 0.0, Math.PI);
                    geometries[name] = sphere;

                }

                if (type === 'cone') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var rmin1 = solid.getAttribute('rmin1');
                    var rmax1 = solid.getAttribute('rmax1');

                    var rmin2 = solid.getAttribute('rmin2');
                    var rmax2 = solid.getAttribute('rmax2');

                    var z = solid.getAttribute('z');

                    var startphi = solid.getAttribute('startphi');
                    var deltaphi = solid.getAttribute('deltaphi');

                    var aunit = solid.getAttribute('aunit');

                    if (aunit === 'deg') {

                        startphi *= Math.PI / 180.0;
                        deltaphi *= Math.PI / 180.0;

                    }

                    // Note: ConeGeometry in THREE assumes inner radii of 0 and rmax1 = 0
                    // radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength
                    var cone = new ConeGeometry(rmax2, z, 32, 1, false, startphi, deltaphi);
                    geometries[name] = cone;

                }

                if (type === 'torus') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var rmin = solid.getAttribute('rmin');
                    var rmax = solid.getAttribute('rmax');
                    var rtor = solid.getAttribute('rtor');
                    var startphi = solid.getAttribute('startphi');
                    var deltaphi = solid.getAttribute('deltaphi');

                    var aunit = solid.getAttribute('aunit');

                    if (aunit === 'deg') {

                        startphi *= Math.PI / 180.0;
                        deltaphi *= Math.PI / 180.0;

                    }

                    // Note: There is no inner radius for a TorusGeometry
                    // and start phi is always 0.0
                    // radius, tube, radialSegments, tubularSegments, arc
                    var torus = new TorusGeometry(1.0 * rtor, rmax, 16, 100, deltaphi);
                    geometries[name] = torus;

                }

                if (type === 'tet') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var v1 = solid.getAttribute('vertex1');
                    var v2 = solid.getAttribute('vertex2');
                    var v3 = solid.getAttribute('vertex3');
                    var v4 = solid.getAttribute('vertex4');

                    if (defines[v1] && defines[v2] && defines[v3] && defines[v4]) {

                        v1 = defines[v1];
                        v2 = defines[v2];
                        v3 = defines[v3];
                        v4 = defines[v4];

                        var tet = new BufferGeometry();

                        const points = [
                            v1,
                            v4,
                            v2,

                            v3,
                            v4,
                            v1,

                            v2,
                            v3,
                            v1,

                            v4,
                            v3,
                            v2,
                        ]
                        // tet.vertices = [v1, v2, v3, v4];

                        // tet.faces.push(new Face3(0, 3, 1));
                        // tet.faces.push(new Face3(2, 3, 0));
                        // tet.faces.push(new Face3(1, 2, 0));
                        // tet.faces.push(new Face3(3, 2, 1));
                        tet.setFromPoints(points)
                        geometries[name] = tet;

                    }

                }

                if (type === 'trd') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var x1 = solid.getAttribute('x1');
                    var x2 = solid.getAttribute('x2');
                    var y1 = solid.getAttribute('y1');
                    var y2 = solid.getAttribute('y2');
                    var z = solid.getAttribute('z');

                    var trd = new BufferGeometry();

                    const points = [
                        new Vector3(-x2, -y2, z),//2
                        new Vector3(-x2, y2, z),//1
                        new Vector3(x2, y2, z),//0

                        new Vector3(x2, y2, z),//0
                        new Vector3(x2, -y2, z),//3
                        new Vector3(-x2, -y2, z),//2

                        new Vector3(x1, y1, -z),//4
                        new Vector3(-x1, y1, -z),//5
                        new Vector3(-x1, -y1, -z),//6

                        new Vector3(-x1, -y1, -z),//6
                        new Vector3(x1, -y1, -z),//7
                        new Vector3(x1, y1, -z),//4

                        new Vector3(x2, y2, z),//0
                        new Vector3(x1, y1, -z),//4
                        new Vector3(x1, -y1, -z),//7

                        new Vector3(x1, -y1, -z),//7
                        new Vector3(x2, -y2, z),//3
                        new Vector3(x2, y2, z),//0

                        new Vector3(-x2, y2, z),//1
                        new Vector3(-x2, -y2, z),//2
                        new Vector3(-x1, -y1, -z),//6

                        new Vector3(-x1, -y1, -z),//6
                        new Vector3(-x1, y1, -z),//5
                        new Vector3(-x2, y2, z),//1

                        new Vector3(-x2, y2, z),//1
                        new Vector3(-x1, y1, -z),//5
                        new Vector3(x1, y1, -z),//4

                        new Vector3(x1, y1, -z),//4
                        new Vector3(x2, y2, z),//0
                        new Vector3(-x2, y2, z),//1

                        new Vector3(-x2, -y2, z),//2
                        new Vector3(x2, -y2, z),//3
                        new Vector3(x1, -y1, -z),//7

                        new Vector3(x1, -y1, -z),//7
                        new Vector3(-x1, -y1, -z),//6
                        new Vector3(-x2, -y2, z),//2
                    ]

                    // trd.vertices.push(new Vector3(x2, y2, z));//0
                    // trd.vertices.push(new Vector3(-x2, y2, z));//1
                    // trd.vertices.push(new Vector3(-x2, -y2, z));//2
                    // trd.vertices.push(new Vector3(x2, -y2, z));//3
                    // trd.vertices.push(new Vector3(x1, y1, -z));//4
                    // trd.vertices.push(new Vector3(-x1, y1, -z));//5
                    // trd.vertices.push(new Vector3(-x1, -y1, -z));//6
                    // trd.vertices.push(new Vector3(x1, -y1, -z));//7

                    // trd.faces.push(new Face3(2, 1, 0));
                    // trd.faces.push(new Face3(0, 3, 2));

                    // trd.faces.push(new Face3(4, 5, 6));
                    // trd.faces.push(new Face3(6, 7, 4));

                    // trd.faces.push(new Face3(0, 4, 7));
                    // trd.faces.push(new Face3(7, 3, 0));

                    // trd.faces.push(new Face3(1, 2, 6));
                    // trd.faces.push(new Face3(6, 5, 1));

                    // trd.faces.push(new Face3(1, 5, 4));
                    // trd.faces.push(new Face3(4, 0, 1));

                    // trd.faces.push(new Face3(2, 3, 7));
                    // trd.faces.push(new Face3(7, 6, 2));

                    trd.setFromPoints(points);
                    // trd.computeVertexNormals();
                    geometries[name] = trd;
                }

                if (type === 'eltube') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var dx = solid.getAttribute('dx');
                    var dy = solid.getAttribute('dy');
                    var dz = solid.getAttribute('dz');

                    var shape = new Shape();
                    // x, y, xRadius, yRadius, startAngle, endAngle, clockwise, rotation
                    shape.absellipse(0, 0, dx, dy, 0.0, 2 * Math.PI, false, 0);

                    var extrudeSettings = {
                        amount: 2 * dz,
                        steps: 1,
                        bevelEnabled: false,
                        curveSegments: 24
                    };

                    var geometry = new ExtrudeGeometry(shape, extrudeSettings);
                    geometry.center();
                    geometries[name] = geometry;

                }

                if (type === 'arb8') {

                    name = solid.getAttribute('name');
                    //console.log(type, name);

                    var dz = solid.getAttribute('dz');

                    var v1x = solid.getAttribute('v1x');
                    var v1y = solid.getAttribute('v1y');

                    var v2x = solid.getAttribute('v2x');
                    var v2y = solid.getAttribute('v2y');

                    var v3x = solid.getAttribute('v3x');
                    var v3y = solid.getAttribute('v3y');

                    var v4x = solid.getAttribute('v4x');
                    var v4y = solid.getAttribute('v4y');

                    var v5x = solid.getAttribute('v5x');
                    var v5y = solid.getAttribute('v5y');

                    var v6x = solid.getAttribute('v6x');
                    var v6y = solid.getAttribute('v6y');

                    var v7x = solid.getAttribute('v7x');
                    var v7y = solid.getAttribute('v7y');

                    var v8x = solid.getAttribute('v8x');
                    var v8y = solid.getAttribute('v8y');

                    var trd = new BufferGeometry();

                    const points = [
                        new Vector3(v7x, v7y, z),//2
                        new Vector3(v6x, v6y, z),//1
                        new Vector3(v5x, v5y, z),//0

                        new Vector3(v5x, v5y, z),//0
                        new Vector3(v8x, v8y, z),//3
                        new Vector3(v7x, v7y, z),//2

                        new Vector3(v1x, v1y, -z),//4
                        new Vector3(v2x, v2y, -z),//5
                        new Vector3(v3x, v3y, -z),//6

                        new Vector3(v3x, v3y, -z),//6
                        new Vector3(v4x, v4y, -z),//7
                        new Vector3(v1x, v1y, -z),//4

                        new Vector3(v5x, v5y, z),//0
                        new Vector3(v1x, v1y, -z),//4
                        new Vector3(v4x, v4y, -z),//7

                        new Vector3(v4x, v4y, -z),//7
                        new Vector3(v8x, v8y, z),//3
                        new Vector3(v5x, v5y, z),//0

                        new Vector3(v6x, v6y, z),//1
                        new Vector3(v7x, v7y, z),//2
                        new Vector3(v3x, v3y, -z),//6

                        new Vector3(v3x, v3y, -z),//6
                        new Vector3(v2x, v2y, -z),//5
                        new Vector3(v6x, v6y, z),//1

                        new Vector3(v6x, v6y, z),//1
                        new Vector3(v2x, v2y, -z),//5
                        new Vector3(v1x, v1y, -z),//4

                        new Vector3(v1x, v1y, -z),//4
                        new Vector3(v5x, v5y, z),//0
                        new Vector3(v6x, v6y, z),//1

                        new Vector3(v7x, v7y, z),//2
                        new Vector3(v8x, v8y, z),//3
                        new Vector3(v4x, v4y, -z),//7

                        new Vector3(v4x, v4y, -z),//7
                        new Vector3(v3x, v3y, -z),//6
                        new Vector3(v7x, v7y, z),//2
                    ]

                    // trd.vertices.push(new Vector3(v5x, v5y, z));
                    // trd.vertices.push(new Vector3(v6x, v6y, z));
                    // trd.vertices.push(new Vector3(v7x, v7y, z));
                    // trd.vertices.push(new Vector3(v8x, v8y, z));

                    // trd.vertices.push(new Vector3(v1x, v1y, -z));
                    // trd.vertices.push(new Vector3(v2x, v2y, -z));
                    // trd.vertices.push(new Vector3(v3x, v3y, -z));
                    // trd.vertices.push(new Vector3(v4x, v4y, -z));

                    // trd.faces.push(new Face3(2, 1, 0));
                    // trd.faces.push(new Face3(0, 3, 2));

                    // trd.faces.push(new Face3(4, 5, 6));
                    // trd.faces.push(new Face3(6, 7, 4));

                    // trd.faces.push(new Face3(0, 4, 7));
                    // trd.faces.push(new Face3(7, 3, 0));

                    // trd.faces.push(new Face3(1, 2, 6));
                    // trd.faces.push(new Face3(6, 5, 1));

                    // trd.faces.push(new Face3(1, 5, 4));
                    // trd.faces.push(new Face3(4, 0, 1));

                    // trd.faces.push(new Face3(2, 3, 7));
                    // trd.faces.push(new Face3(7, 6, 2));

                    trd.setFromPoints(points);
                    geometries[name] = trd;

                }

            }
        }

        function parseVolumes() {
            var volumes = GDML.querySelectorAll('volume');

            for (var i = 0; i < volumes.length; i++) {

                var name = volumes[i].getAttribute('name');
                var solidrefs = volumes[i].childNodes;

                for (var j = 0; j < solidrefs.length; j++) {

                    var type = solidrefs[j].nodeName;

                    if (type === 'solidref') {
                        var solidref = solidrefs[j].getAttribute('ref');
                        refs[name] = solidref;

                    }
                }
            }
        }

        function parsePhysVols() {
            var physvols = GDML.querySelectorAll('physvol');

            for (var i = 0; i < physvols.length; i++) {

                var name = physvols[i].getAttribute('name');

                if (!name) {
                    name = 'JDoe';
                }

                var children = physvols[i].childNodes;
                var volumeref = '';

                var position = new Vector3(0, 0, 0);
                var rotation = new Vector3(0, 0, 0);

                var geometry;

                var material = new MeshPhongMaterial({
                    color: 0xffffff, //delete randomColor
                    transparent: true,
                    opacity: 0.6, //set opacity to 0.6
                    wireframe: false
                });

                for (var j = 0; j < children.length; j++) {

                    var type = children[j].nodeName;

                    if (type === 'volumeref') {

                        var volumeref = children[j].getAttribute('ref');
                        geometry = geometries[refs[volumeref]];

                    }

                    if (type === 'positionref') {

                        var positionref = children[j].getAttribute('ref');
                        position = defines[positionref];

                    }

                    if (type === 'rotationref') {

                        var rotationref = children[j].getAttribute('ref');

                    }

                    if (type === 'position') {

                        var x = children[j].getAttribute('x');
                        var y = children[j].getAttribute('y');
                        var z = children[j].getAttribute('z');

                        // Note: how to handle units?
                        position.set(x, y, z);
                    }

                    if (type === 'rotation') {

                        var x = children[j].getAttribute('x') * Math.PI / 180.0;
                        var y = children[j].getAttribute('y') * Math.PI / 180.0;
                        var z = children[j].getAttribute('z') * Math.PI / 180.0;

                        rotation.set(x, y, z);
                    }

                }

                if (geometry) {
                    var mesh = new Mesh(geometry, material);
                    mesh.name = name;
                    mesh.visible = true;

                    mesh.position.set(position.x, position.y, position.z);
                    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
                    group.add(mesh);

                }
            }
        }

        function parseSetup() {
            var setup = GDML.querySelectorAll('setup');
            var worlds = setup[0].childNodes;

            for (var i = 0; i < worlds.length; i++) {

                var nodeName = worlds[i].nodeName;
                var node = worlds[i];

                if (nodeName === 'world') {

                    var volumeref = node.getAttribute('ref');
                    var solidref = refs[volumeref];

                    var geometry = geometries[solidref];
                    var material = new MeshBasicMaterial({
                        color: 0xcccccc,
                        wireframe: false,
                        transparent: true,
                        opacity: 0.5
                    });

                    var mesh = new Mesh(geometry, material);
                    mesh.name = nodeName;
                    mesh.visible = true;

                    mesh.position.set(0.0, 0.0, 0.0);
                    group.add(mesh);

                }

            }
        }

        parseDefines();
        parseSolids();
        parseVolumes();
        parsePhysVols();
        parseSetup();

        return group
    }

}


export { GDMLLoader }