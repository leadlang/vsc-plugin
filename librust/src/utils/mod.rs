use interpreter::Package as TraitPackage;
use libloading::Library;
use std::collections::HashMap;

pub struct Package {
  pub doc: HashMap<String, HashMap<&'static str, &'static [&'static str; 3]>>,
  _inner: Library,
}

impl Package {
  pub fn new(path: &str) -> Self {
    unsafe {
      let library = Library::new(path).expect("Unable to load library");

      let pkgs = library
        .get::<fn() -> Vec<Box<dyn TraitPackage>>>(b"modules")
        .expect("Unable to load symbol")();

      let mut doc = HashMap::new();

      for pkg in pkgs {
        let name = String::from_utf8_lossy(pkg.name()).to_string();
        let docs = pkg.doc();

        doc.insert(name, docs);
      }

      Self {
        _inner: library,
        doc,
      }
    }
  }
}