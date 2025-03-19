use std::env::consts::{DLL_PREFIX, DLL_SUFFIX};

use neon::prelude::*;
use utils::Package;

mod utils;

fn load_all(mut cx: FunctionContext) -> JsResult<JsObject> {
  let path: Handle<'_, JsString> = cx.argument::<JsString>(0)?;
  let path = path.value(&mut cx);

  let out = cx.empty_object();

  let pkg = Package::new(&path);

  let fns = cx.empty_object();

  for (a, b) in pkg.doc.into_iter() {
    for (func, desc) in b.into_iter() {
      let st = cx.string(&a);

      let [regex, ret, desc] = &desc;

      let regex = cx.string(regex);
      let ret = cx.string(ret);
      let desc = cx.string(desc);

      let val = cx.empty_object();
      val.set(&mut cx, "package", st)?;
      val.set(&mut cx, "regex", regex)?;
      val.set(&mut cx, "returns", ret)?;
      val.set(&mut cx, "description", desc)?;

      fns.set(&mut cx, func, val)?;
    }
  }

  out.set(&mut cx, "cmds", fns)?;

  let rts = cx.empty_object();

  for (a, (name, b)) in pkg.runtimes.into_iter() {
    let name = cx.string(name);

    let funcs = cx.empty_object();

    for (func, desc) in b.into_iter() {
      let st = cx.string(&a);

      let [regex, ret, desc] = &desc;

      let regex = cx.string(regex);
      let ret = cx.string(ret);
      let desc = cx.string(desc);

      let val = cx.empty_object();
      val.set(&mut cx, "package", st)?;
      val.set(&mut cx, "regex", regex)?;
      val.set(&mut cx, "returns", ret)?;
      val.set(&mut cx, "description", desc)?;

      funcs.set(&mut cx, func, val)?;
    }

    rts.set(&mut cx, name, funcs)?;
  }

  out.set(&mut cx, "rts", rts)?;

  Ok(out)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
  cx.export_function("load_all", load_all)?;

  let prefix = DLL_PREFIX;
  let prefix = JsString::new(&mut cx, prefix);
  cx.export_value("prefix", prefix)?;

  let suffix = DLL_SUFFIX;
  let suffix = JsString::new(&mut cx, suffix);
  cx.export_value("suffix", suffix)?;

  Ok(())
}
