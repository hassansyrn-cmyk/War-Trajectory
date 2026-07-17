using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class Builder
{
    public static void BuildAndroid()
    {
        Debug.Log("=========================================");
        Debug.Log($"Unity Version: {Application.unityVersion}");
        Debug.Log("Starting custom BuildAndroid() process...");
        Debug.Log("=========================================");

        // Get and filter scenes
        var scenes = EditorBuildSettings.scenes;
        if (scenes == null || scenes.Length == 0)
        {
            throw new Exception("Build failed: No scenes are found in EditorBuildSettings!");
        }

        var enabledScenePaths = scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        if (enabledScenePaths.Length == 0)
        {
            throw new Exception("Build failed: No enabled scenes are found in EditorBuildSettings!");
        }

        Debug.Log($"Total Scene Count in Build Settings: {scenes.Length}");
        Debug.Log($"Enabled Scene Count to include in Build: {enabledScenePaths.Length}");
        foreach (var path in enabledScenePaths)
        {
            Debug.Log($"Checking Scene Path: {path}");
            if (!File.Exists(path))
            {
                throw new FileNotFoundException($"Build failed: Scene file not found at path: {path}");
            }
            Debug.Log($"Verified Scene Path Exists: {path}");
        }

        // Get output path from command-line arguments
        string buildPath = GetArg("-customBuildPath") ?? GetArg("-buildPath") ?? "build/Android/Android.apk";
        Debug.Log($"Output APK path: {buildPath}");

        // Ensure directory exists
        string directory = Path.GetDirectoryName(buildPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
            Debug.Log($"Created output directory: {directory}");
        }

        // Configure build options
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
        {
            scenes = enabledScenePaths,
            locationPathName = buildPath,
            target = BuildTarget.Android,
            targetGroup = BuildTargetGroup.Android,
            options = BuildOptions.None
        };

        Debug.Log("Starting BuildPipeline.BuildPlayer...");
        BuildReport report = BuildPipeline.BuildPlayer(buildPlayerOptions);
        BuildSummary summary = report.summary;

        if (summary.result == BuildResult.Succeeded)
        {
            Debug.Log("=========================================");
            Debug.Log($"Build SUCCEEDED!");
            Debug.Log($"Output file size: {summary.totalSize} bytes");
            Debug.Log("=========================================");
        }
        else if (summary.result == BuildResult.Failed)
        {
            Debug.LogError("=========================================");
            Debug.LogError($"Build FAILED!");
            Debug.LogError($"Total Errors: {summary.totalErrors}");
            Debug.LogError("=========================================");
            throw new Exception($"Build failed with {summary.totalErrors} errors.");
        }
        else
        {
            throw new Exception($"Build completed with result: {summary.result}");
        }
    }

    private static string GetArg(string name)
    {
        string[] args = Environment.GetCommandLineArgs();
        for (int i = 0; i < args.Length - 1; i++)
        {
            if (args[i] == name)
            {
                return args[i + 1];
            }
        }
        return null;
    }
}
