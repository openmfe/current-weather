for f in $(ls *.ttf | sed -e 's|.ttf||g'); do
    pyftsubset $f.ttf --flavor=woff2 --output-file="$f.woff2" --unicodes="U+0020-007F,U+00A0-00FF,U+20AC,U+2010,U+2013,U+2014,U+2018,U+2019,U+201A,U+201C,U+201D,U+201E,U+2039,U+203A,U+2026,U+2022"
done
