# Nonsense with x11, i3, and xdotool

Please consider the following line in my i3 configuration.

```
set $alt Mod1
bindsym $alt+d exec xdotool type --clearmodifiers --delay 1ms abcd$(date +%y-%m-%d)
```

If you want to find out what `bindsym $alt+d exec` does, look at the i3 user guide. If you want to find out what `xdotool type --clearmodifiers --delay 1ms` does, look at xdotool(1). If _you know_ what the `abcd` in `abcd$(date +%y-%m-%d)` does, enlighten me.

# Why Do I Need This?

I often prefix filenames with the current date, e.g. 26-05-06. There are reasons for this, but that's not the point of this note. I often need to type the current date and this is rather annoying, hence I like to have a hotkey which instantly types the date for me (preferably `alt+d`). I used AutoHotkey to achieve this during my windows years. After many months of using i3/X11/arch, I've finally grown tired of not having it.

# Getting this to Work

... was and is a headache. In the beginning, I started with a line much like the one above. I don't have a record of it, but I believe it looked like this.

```
bindsym $alt+d exec xdotool type --clearmodifiers $(date +%y-%m-%d)
```

Though this seems very sensible, it doesn't work. In fact, nothing is typed upon pressing `alt+d`. I then tried a multitude of things: ...

```
# ... sending an alt keyup event.
bindsym $alt+d exec xdotool keyup alt type --clearmodifiers $(date +%y-%m-%d)

# ... saving the date to clipboard and using the standard method to paste it. 
bindsym $alt+d exec sh -c 'printf "$(date +%y-%m-%d)" | xclip -selection clipboard && xdotool key ctrl+v'

# ... saving to a different xclip selection and using a different paste method.
#bindsym $alt+d exec sh -c 'printf "$(date +%y-%m-%d)" | xclip -selection primary && xdotool keyup alt click 2'

# ... running a shellscript containing the xdotool command.
bindsym $alt+d exec type-date.sh
# Contents of type-date.sh
current_date=$(date +%y-%m-%d)
xdotool type --clearmodifiers --delay 1ms abcd$current_date

# ...using the bindsym --release flag.
bindsym --release $alt+d exec xdotool type --clearmodifiers --delay 1ms $(date +%y-%m-%d)
```

Some of these don't work at all; Some work with caveats. Going through the details of what does and doesn't work would be a waste of our time.

# ABCD

At a loss, I then just tried printing the alphabet.

```
bindsym $alt+d exec xdotool type --clearmodifiers abcdefghijklmnop
```

This somewhat works; The caveat is that only `efghi...` is printed _consistently_, yes, _consistently_. I have yet to see a case where more or less than the first four characters are eliminated, hence the line I started this note with.

```
bindsym $alt+d exec xdotool type --clearmodifiers --delay 1ms abcd$(date +%y-%m-%d)
```

_Even more strangely_, using `aaaa` instead of `abcd` doesn't work.

# Another Hack

Some searching lead me to using sleep, which does indeed allow the first characters to be printed.
```
bindsym $alt+d exec sleep 0.1 && xdotool type --clearmodifiers --delay 1ms $(date +%y-%m-%d)
```
However, if I hold down atl+d, nothing is ever printed. So, even though this does somewhat work, the consistency and responsiveness of the `abcd` nonsense makes the sleep based solution less appealing.

# An Update

As of 26-08-21, I'm still successfully using this hack. The datestamp in the previous sentence is evidence.
