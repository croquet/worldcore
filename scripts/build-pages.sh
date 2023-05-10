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
        COMMIT=$(git log -1 --format='%ad %H' --date=format:'%Y-%m-%d %H:%M:%S')
        echo "Commit: $COMMIT" > build.log
        npm run build 2>&1 >> build.log
        BUILD_ERROR=$?
        cat build.log
        DATE=$(git ls-tree -r --name-only HEAD -- . | grep -v 'package.*json' | xargs -n 1 git log -1 --format='%ad' --date=format:'%Y-%m-%d' | sort | tail -1)
        if [ $BUILD_ERROR -eq 0 ] ; then
            mv -v dist ../../_site/$APP
            LINKS+=("<p>${DATE} <a href=\"${APP}/\"><b>${APP}</b></a> (<a href=\"${APP}/build.log\">log</a>)</p>")
        else
            mkdir ../../_site/$APP
            echo "<H1>Build failed</h1><pre>" > ../../_site/$APP/index.html
            cat build.log >> ../../_site/$APP/index.html
            echo "</pre>" >> ../../_site/$APP/index.html
            LINKS+=("<p>${DATE} <b>${APP} BUILD FAILED</b> (<a href=\"${APP}/build.log\">log</a>)</p>")
        fi
        mv -v build.log ../../_site/$APP/
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
    <style>
        body { font-family: monospace; }
    </style>
</head>
<body>
    <h1>Worldcore Builds</h1>
    <h2>${COMMIT} (<a href="https://github.com/croquet/worldcore/actions/workflows/deploy-to-pages.yml">previous</a>)</h2>
    ${LINKS[@]}
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
