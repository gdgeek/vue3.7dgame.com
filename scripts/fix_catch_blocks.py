#!/usr/bin/env python3
"""Fix catch blocks where error is now unknown instead of any."""

fixes = {
    "src/composables/useEmailVerification.ts": [
        ("    } catch (err) {\n      error.value = err.error?.message",
         "    } catch (err) {\n      const apiErr = err as { error?: { message?: string; code?: string; retry_after?: number } };\n      error.value = apiErr.error?.message"),
        ("      if (err.error?.code === \"ACCOUNT_LOCKED\" && err.error?.retry_after) {\n        startLockCountdown(err.error.retry_after);",
         "      if (apiErr.error?.code === \"ACCOUNT_LOCKED\" && apiErr.error?.retry_after) {\n        startLockCountdown(apiErr.error.retry_after);"),
    ],
    "src/views/campus/components/ClassDetail.vue": [
        ("    const errorMsg =\n      error.response?.data?.message || t(\"common.operationFailed\");",
         "    const axiosErr = error as { response?: { data?: { message?: string } } };\n    const errorMsg =\n      axiosErr.response?.data?.message || t(\"common.operationFailed\");"),
        ("      const backendMsg = error.response?.data?.message || \"\";",
         "      const axiosErr = error as { response?: { data?: { message?: string } } };\n      const backendMsg = axiosErr.response?.data?.message || \"\";"),
    ],
    "src/views/campus/group.vue": [
        ("    const errorMsg = error.response?.data?.message || t(\"common.createFailed\");",
         "    const axiosErr = error as { response?: { data?: { message?: string } } };\n    const errorMsg = axiosErr.response?.data?.message || t(\"common.createFailed\");"),
    ],
    "src/views/login/index.vue": [
        ("} catch (e) {\n    reject(e.message);",
         "} catch (e) {\n    reject(e instanceof Error ? e.message : String(e));"),
    ],
    "src/views/register/index.vue": [
        ("} catch (e) {\n    reject(e.message);",
         "} catch (e) {\n    reject(e instanceof Error ? e.message : String(e));"),
    ],
    "src/views/meta/script.vue": [
        ("  } catch (e) {\n    console.log(\"ex:\" + e);",
         "  } catch (e) {\n    console.log(\"ex:\" + String(e));"),
    ],
    "src/views/verse/script.vue": [
        ("    console.error(e);",
         "    console.error(String(e));"),
    ],
}

for filepath, replacements in fixes.items():
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        changed = False
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new, 1)
                changed = True
                print(f"  Fixed: {filepath}")
            else:
                print(f"  WARN not found: {filepath}")
        if changed:
            with open(filepath, 'w') as f:
                f.write(content)
    except FileNotFoundError:
        print(f"  SKIP: {filepath}")

print("\nDone")
