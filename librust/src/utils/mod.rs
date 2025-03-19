use interpreter::{phf, Package as TraitPackage, RuntimeValue};
use libloading::Library;
use std::collections::HashMap;

pub struct Package {
  pub doc: HashMap<String, HashMap<&'static str, &'static [&'static str; 3]>>,
  pub runtimes: HashMap<&'static str, (&'static str, HashMap<&'static str, &'static [&'static str; 3]>)>,
  _inner: Library,
}

impl Package {
  pub fn new(path: &str) -> Self {
    unsafe {
      let library = Library::new(path).expect("Unable to load library");

      let pkgs = library
        .get::<fn() -> &'static [&'static dyn TraitPackage]>(b"modules")
        .expect("Unable to load symbol")();

      let mut doc = HashMap::new();

      for pkg in pkgs {
        let name = String::from_utf8_lossy(pkg.name()).to_string();
        let docs = pkg.doc();

        doc.insert(name, docs);
      }

      let mut runtimes = HashMap::new();

      let pkgs = library
        .get::<fn() -> phf::map::Entries<'static, &'static str, &'static dyn RuntimeValue>>(
          b"runtimes",
        )
        .expect("Unable to load symbol")();

      for (key, val) in pkgs {
        let name = val.name();
        let docs = val.doc();

        let docs: HashMap<&'static str, &'static [&'static str; 3]> = docs
          .into_iter()
          .map(|(k, v)| (k, v))
          .collect();

        runtimes.insert(*key, (name, docs));
      }

      Self {
        _inner: library,
        doc,
        runtimes
      }
    }
  }
}
