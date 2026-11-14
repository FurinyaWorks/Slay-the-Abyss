// Fixed current-only trust leaf. Original CI archive and historical views remain unchanged.
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const release660CiCurrent=freeze({
  "files": {
    "data/presentation/ui_theme.json": {
      "before": "ea3c555c1500defce6f353e33fab8fea917b1de6c18ad17c9d6e8008f473ab75",
      "after": "d4938b708414f636c6912e78bb73b70a5a37395c22023e06ea0e53dc2aa23896"
    },
    "docs/legal/assets.json": {
      "before": "b2908ee500f6cee5db1186d67b7ec07723c281a91f72b48c74e6197fdbbf1ecd",
      "after": "95dfa9c1a261092b434edf64bcdb05df33a2d80dd92679da27c2dfb6cd7bbdc9"
    },
    "src/lua/abyss_game_ui_view.lua": {
      "before": "182d5a5d4e238665c36e9d6f2b00abd510ce42df284a225fd62a9ec896eb97fd",
      "after": "115eaa20717466bd8860524a7eb40417f34cae27059c904229997263345d9ad6"
    },
    "tests/game-ui.test.mjs": {
      "before": "87437b327e0ef581d7aeec14fd5d1fc12fe4f69c409fc0f46bc257de57fe9a1d",
      "after": "06e365a0da679495296f090a771622474acadcd84f806b9220877ad102e6fa7a"
    },
    "tests/helpers/closeout-source-epoch.mjs": {
      "before": "552e5980a76b46fcd030fcafe516d5b7673021dce0a7b0c23072bfb67dcf1e40",
      "after": "9cfaae893a00e4ce76eb38b7199290ea53c1aa8662b4e9315eda7e3d992b12f7"
    },
    "tests/helpers/copy-integration-source-closure.mjs": {
      "before": "17f1e337b452ed462ee189d026145f1296c9c6992da4ba7ddb0cd1229d5816b0",
      "after": "e4beaf3ab021c65aa822aae20d60fac7052743976b9c568f6cd84cbd0a136308"
    },
    "tests/helpers/integrated-ci-source.mjs": {
      "before": "9ae59552fb4a6b832197b4d378204b77f819be04178ca4143e38635077b14c8d",
      "after": "62b3b8ced264a1e1ab64853f01fffabe5ecdb3537caa4db8039d1a48a3f24f6c"
    },
    "tests/integration-source-epoch.test.mjs": {
      "before": "f557ed773b0b3c811a12a2eedadf3678112c97d47ad6a1a2db2f7d7570a1d4a9",
      "after": "136448db2557d4dd73bbde9177591d932eaeccf6b3cd551c97871d55814ba660"
    },
    "tests/lowcost-art.test.mjs": {
      "before": "65b8dc92ece37ea0156eda7a190859aa0f76a8324452d80134f0fef451ca8105",
      "after": "c57b34373083a1e2ce35d7e39ef4043cb77cf9da447a6b42ad74c12476329952"
    },
    "tests/lua/game_ui_timer_safety.lua": {
      "before": "54d87e0ccd2194e46ea35152409281c706a374d60df91d6f2ecf4380b2157d59",
      "after": "7e50afff6ed0215d623d2d6442aac7fd3e47d267fed778ebd001815feaa70810"
    },
    "tests/lua/lowcost_art.lua": {
      "before": "4d450e7de4a7d59002a8f026a6a8966af9a58867951d794dc20ed2e167d58e8e",
      "after": "69b762369761b64e0db29fdd0e424fdcf8db3d72740d74fc7290e31d85447b1e"
    },
    "tests/integrated-ci-source.cases.mjs": {
      "before": "2dd0201a30f3307dfcc0351902050f9bc268a1e802aaf1a181b5c92117b5a664",
      "after": "49cd1a5d163a242e489aea7426371782af0dab67b8d233bcf74f817d80934b70"
    }
  },
  "closure": {
    "tests/helpers/closeout-source-epoch.mjs": {
      "before": "552e5980a76b46fcd030fcafe516d5b7673021dce0a7b0c23072bfb67dcf1e40",
      "after": "9cfaae893a00e4ce76eb38b7199290ea53c1aa8662b4e9315eda7e3d992b12f7"
    }
  },
  "added": {
    "tests/helpers/release-660-source-epoch.mjs": "07c35997ceb7b07b865fb2103c5fe6403b22ec833ab59826b6f0ad52510c8421",
    "tests/helpers/release-660-source-epoch.json.gz": "7d1fb1fdf78a68f8e78cea8b5918e80d8f2aab6e0d78499e324281499a3606fc",
    "tests/helpers/release-660-helper-closure.mjs": "515aebe200d9642a5f6fc5fc4b252c619d25ad4eb46832e4ae7f376161073f89",
    "tests/helpers/generate-release-660-source-epoch.py": "ac91c368b78e69c322f6de6b3418f6ae9561a6c36212f12392eb1e12d8c7507f"
  }
});
