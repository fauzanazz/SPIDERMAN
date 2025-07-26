@echo off
setlocal enabledelayedexpansion

echo Renaming all .svg files to lowercase...

:: Loop through all .svg files in the current directory
for %%f in (*.svg) do (
    set "filename=%%f"
    set "lowerfilename=!filename!"

    :: Convert the entire filename to lowercase using string replacement
    :: This is a more robust way to handle the conversion in batch
    set "lowerfilename=!lowerfilename:A=a!"
    set "lowerfilename=!lowerfilename:B=b!"
    set "lowerfilename=!lowerfilename:C=c!"
    set "lowerfilename=!lowerfilename:D=d!"
    set "lowerfilename=!lowerfilename:E=e!"
    set "lowerfilename=!lowerfilename:F=f!"
    set "lowerfilename=!lowerfilename:G=g!"
    set "lowerfilename=!lowerfilename:H=h!"
    set "lowerfilename=!lowerfilename:I=i!"
    set "lowerfilename=!lowerfilename:J=j!"
    set "lowerfilename=!lowerfilename:K=k!"
    set "lowerfilename=!lowerfilename:L=l!"
    set "lowerfilename=!lowerfilename:M=m!"
    set "lowerfilename=!lowerfilename:N=n!"
    set "lowerfilename=!lowerfilename:O=o!"
    set "lowerfilename=!lowerfilename:P=p!"
    set "lowerfilename=!lowerfilename:Q=q!"
    set "lowerfilename=!lowerfilename:R=r!"
    set "lowerfilename=!lowerfilename:S=s!"
    set "lowerfilename=!lowerfilename:T=t!"
    set "lowerfilename=!lowerfilename:U=u!"
    set "lowerfilename=!lowerfilename:V=v!"
    set "lowerfilename=!lowerfilename:W=w!"
    set "lowerfilename=!lowerfilename:X=x!"
    set "lowerfilename=!lowerfilename:Y=y!"
    set "lowerfilename=!lowerfilename:Z=z!"

    :: Check if the filename actually changed
    if not "!filename!"=="!lowerfilename!" (
        echo Renaming "%%f" to "!lowerfilename!"
        ren "%%f" "!lowerfilename!"
    ) else (
        echo "%%f" is already lowercase. Skipping.
    )
)

echo Done.
pause
