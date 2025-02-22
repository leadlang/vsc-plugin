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
            let desc = cx.string(desc);

            let val = cx.empty_object();
            val.set(&mut cx, "package", st)?;
            val.set(&mut cx, "description", desc)?;

            out.set(&mut cx, func, val)?;
        }
    }

    Ok(out)
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("load_all", load_all)?;

    Ok(())
}
