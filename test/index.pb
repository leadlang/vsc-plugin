# Let us print "Hello World"
$toPrint: malloc string "Hello World"

$to: fmt "Hello world ->$toPrint"

*if$hi $data: fmt "HelloNow"
*else$hi $data: fmt "HelloNow"

$data: *import leadcord

print $data

$data::hello hi