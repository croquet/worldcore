#!/bin/bash
# this script is used to build the github pages site
# with all tutorials and examples
# at https://croquet.github.io/worldcore/

# normally executed via .github/workflows/deploy-to-pages.yml
# but can be run locally, open _site/index.html in a browser to view

npx lerna bootstrap
rm -rf _site
mkdir _site
LINKS=()
TOP=$(git rev-parse --show-toplevel)
for DIR in tutorials examples ; do
    cd $TOP
    mkdir _site/$DIR
    PKGS=$(ls $DIR/*/package.json)
    for PKG in $DIR/*/package.json ; do
        APP=$(dirname $PKG)
        echo
        echo "=== Building $APP ==="
        cd $TOP/$APP
        COMMIT=$(git log -1 --format='%ad %H' --date=format:'%Y-%m-%d %H:%M:%S' -- .)
        npm run build
        if [ $? -eq 0 ] ; then
            mv -v dist ../../_site/$APP
            LINKS+=("<dt><a href=\"${APP}\"><b>${APP}</b></a></dt><dd>${COMMIT}</dd>")
        else
            LINKS+=("<dt><b>${APP} (build failed)</b></dt><dd>${COMMIT}</dd>")
        fi
    done
done

cd $TOP

echo
echo "=== Building index page ==="
cat > _site/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Worldcore Builds</title>
</head>
<body style="font-family:monospace">
    <h1>Worldcore Builds</h1>
    <h2><a href="https://github.com/croquet/worldcore/actions/workflows/deploy-to-pages.yml">Build Logs</a></h2>
    <dl>${LINKS[@]}</dl>
    <script>
        const {search, hash} = window.location;
        const links = document.getElementsByTagName('a');
        for (const link of links) {
            if (link.href.startsWith('http')) continue;
            const url = new URL(link.href);
            url.search = search;
            url.hash = hash;
            link.href = url.toString();
        }
    </script>
</body>
</html>
EOF
