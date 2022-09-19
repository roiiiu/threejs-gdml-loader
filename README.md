# Threejs-GDML-loader
This is the `GDML` file loader for the new version of `three.js`.  
Based on the work of [tpmccauley](https://github.com/tpmccauley).
## usage
``` ts
import {GDMLLoader} from "threejs-gdml-loader"

gdmlLoader = new GDMLLoader();
gdmlLoader.load("path-to-asset", (object)=>{
    scene.add(object);
});
```
## Tips
This version is still under development. Only simple geometry import has been tested so far.
