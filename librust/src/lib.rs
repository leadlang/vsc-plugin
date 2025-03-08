use std::env::consts::{DLL_PREFIX, DLL_SUFFIX};

use neon::prelude::*;
use utils::Package;

mod utils;

fn load_all(mut cx: FunctionContext) -> JsResult<JsObject> {
    let path: Handle<'_, JsString> = cx.argument::<JsString>(0)?;
    let path = path.value(&mut cx);

    let out = cx.empty_object();

    let pkg = Package::new(&path);

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

            out.set(&mut cx, func, val)?;
        }
    }

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
