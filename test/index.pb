# Comment

$a: malloc @s"Hello World"

*if$hello *if$hello $hello::hi ->&$hi

$hello::malp ->&^

print ->&$a

*mod test/hello

*run test/index

$a: malloc string "12"

str::to_int $a ->$a

hello init ->$a