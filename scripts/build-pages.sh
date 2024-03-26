#!/bin/bash
# this script is used to build the github pages site
# with all tutorials and examples
# at https://croquet.github.io/worldcore/

# normally executed via .github/workflows/deploy-to-pages.yml
# but can be run locally, open _site/index.html in a browser to view

npm ci || exit 1
npx lerna bootstrap || exit 1
rm -rf _site
mkdir _site
LINKS=()
FAILED=()
SUCCESS=()
TOP=$(git rev-parse --show-toplevel)
COMMIT=$(git log -1 --format='%H')
COMMIT_DATE=$(git log -1 --format='%cd' --date=format:'%Y-%m-%d %H:%M:%S')
for DIR in tutorials examples ; do
    cd $TOP
    mkdir _site/$DIR
    PKGS=$(ls $DIR/*/package.json)
    for PKG in $DIR/*/package.json ; do
        APP=$(dirname $PKG)
        echo
        echo "=== Building $APP ==="
        cd $TOP/$APP
        echo "Commit: $COMMIT" > build.log
        npm run build >> build.log 2>&1
        BUILD_ERROR=$?
        cat build.log
        APP_DATE=$(git ls-tree -r --name-only HEAD -- . | grep -v 'package.*json' | xargs -n 1 git log -1 --format='%cd' --date=format:'%Y-%m-%d' | sort | tail -1)
        if [ $BUILD_ERROR -eq 0 ] ; then
            mv -v dist ../../_site/$APP
            LINKS+=("<p>${APP_DATE} <a href=\"${APP}/\"><b>${APP}</b></a> (<a href=\"${APP}/build.log\">log</a>)</p>")
            SUCCESS+=($APP)
        else
            mkdir ../../_site/$APP
            echo "<H1>Build failed</h1><pre>" > ../../_site/$APP/index.html
            cat build.log >> ../../_site/$APP/index.html
            echo "</pre>" >> ../../_site/$APP/index.html
            LINKS+=("<p>${APP_DATE} <b>${APP} BUILD FAILED</b> (<a href=\"${APP}/build.log\">log</a>)</p>")
            FAILED+=($APP)
        fi
        mv -v build.log ../../_site/$APP/
    done
done

cd $TOP

LATEST_TAG=$(git describe --tags --abbrev=0)
COMMITS_SINCE=$(git rev-list --count ${LATEST_TAG}..HEAD)
VERSION="${LATEST_TAG}"
if [ $COMMITS_SINCE -gt 0 ] ; then
    VERSION="${VERSION}+${COMMITS_SINCE}"
fi

echo
echo "=== Building index page ==="
cat > _site/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Worldcore Build ${VERSION}</title>
    <style>
        body { font-family: monospace; }
    </style>
</head>
<body>
    <h1>Worldcore Build ${VERSION}</h1>
    <h2>${COMMIT_DATE} <a href="https://github.com/croquet/worldcore/commits/${COMMIT}/">${COMMIT}</a>
    (<a href="${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}">full log</a>,
        <a href="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/workflows/deploy-to-pages.yml">previous</a>)</h2>
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

if [ -n "$SLACK_HOOK_URL" ] ; then
    echo
    echo "=== Sending slack message ==="
    URL="https://croquet.github.io/worldcore/"
    NUM_FAILED=${#FAILED[@]}
    NUM_TOTAL=$((${#SUCCESS[@]} + ${#FAILED[@]}))
    if [ $NUM_FAILED -eq 0 ] ; then
        JSON="{\"text\": \"😍 *Worldcore build ${VERSION} succeeded for all apps* 😍\n${URL}\"}"
    else
        APPS=""
        for APP in ${FAILED[@]} ; do
            LOG="https://croquet.github.io/worldcore/${APP}/build.log"
            APPS="${APPS}\n❌ <${LOG}|${APP}>"
        done
        for APP in ${SUCCESS[@]} ; do
            RUN="https://croquet.github.io/worldcore/${APP}/"
            APPS="${APPS}\n✅ <${RUN}|${APP}>"
        done
        JSON="{\"text\": \"👷‍♀️ *Worldcore app build ${VERSION} failed for ${NUM_FAILED}/${NUM_TOTAL} apps* 👷‍♀️\n${URL}\n${APPS}\"}"
    fi
    curl -sSX POST -H 'Content-type: application/json' --data "${JSON}" $SLACK_HOOK_URL
else
    echo
    echo "=== No SLACK_HOOK_URL set, not sending slack message ==="
fi
